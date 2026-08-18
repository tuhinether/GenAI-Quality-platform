import { createHash } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import type { Db } from "./client";
import { auditLog } from "./schema";

/** Deterministic JSON.stringify (sorted keys) so hashing is stable regardless of key order. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

export function computeAuditHash(entry: {
  projectId: string;
  traceId: string | null;
  eventType: string;
  payload: unknown;
  prevHash: string | null;
}): string {
  const material = canonicalJson({
    projectId: entry.projectId,
    traceId: entry.traceId,
    eventType: entry.eventType,
    payload: entry.payload,
    prevHash: entry.prevHash,
  });
  return createHash("sha256").update(material).digest("hex");
}

export interface AppendAuditLogInput {
  projectId: string;
  traceId?: string | null;
  eventType: string;
  payload: unknown;
}

/**
 * Appends a new audit log entry, chaining it to the previous entry for the
 * same project so any later tampering (edit/delete) breaks the hash chain
 * and is detectable by verifyAuditChain.
 */
export async function appendAuditLog(db: Db, input: AppendAuditLogInput) {
  const [last] = await db
    .select({ hash: auditLog.hash })
    .from(auditLog)
    .where(eq(auditLog.projectId, input.projectId))
    .orderBy(desc(auditLog.createdAt))
    .limit(1);

  const prevHash = last?.hash ?? null;
  const hash = computeAuditHash({
    projectId: input.projectId,
    traceId: input.traceId ?? null,
    eventType: input.eventType,
    payload: input.payload,
    prevHash,
  });

  const [row] = await db
    .insert(auditLog)
    .values({
      projectId: input.projectId,
      traceId: input.traceId ?? null,
      eventType: input.eventType,
      payload: input.payload as object,
      prevHash,
      hash,
    })
    .returning();

  return row;
}

export interface AuditChainVerification {
  valid: boolean;
  brokenAtEntryId: string | null;
  entriesChecked: number;
}

/** Recomputes the hash chain for a project's audit log and reports the first broken link, if any. */
export async function verifyAuditChain(db: Db, projectId: string): Promise<AuditChainVerification> {
  const entries = await db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.projectId, projectId)))
    .orderBy(asc(auditLog.createdAt));

  let expectedPrevHash: string | null = null;
  for (const entry of entries) {
    if (entry.prevHash !== expectedPrevHash) {
      return { valid: false, brokenAtEntryId: entry.id, entriesChecked: entries.length };
    }
    const recomputed = computeAuditHash({
      projectId: entry.projectId,
      traceId: entry.traceId,
      eventType: entry.eventType,
      payload: entry.payload,
      prevHash: entry.prevHash,
    });
    if (recomputed !== entry.hash) {
      return { valid: false, brokenAtEntryId: entry.id, entriesChecked: entries.length };
    }
    expectedPrevHash = entry.hash;
  }

  return { valid: true, brokenAtEntryId: null, entriesChecked: entries.length };
}
