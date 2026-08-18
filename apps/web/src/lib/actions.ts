"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { annotations, apiKeys, appendAuditLog, datasetExamples, datasets, generateApiKey, getDb } from "./db";

export async function createDataset(projectId: string, name: string, description: string) {
  const db = getDb();
  const [dataset] = await db.insert(datasets).values({ projectId, name, description }).returning();
  revalidatePath("/datasets");
  return dataset;
}

export async function addDatasetExample(
  datasetId: string,
  input: unknown,
  expectedOutput: unknown,
  metadata?: Record<string, unknown>,
) {
  const db = getDb();
  const [example] = await db
    .insert(datasetExamples)
    .values({ datasetId, input: input as object, expectedOutput: expectedOutput as object, metadata })
    .returning();
  revalidatePath(`/datasets/${datasetId}`);
  return example;
}

export async function submitAnnotation(
  projectId: string,
  traceId: string,
  reviewerId: string,
  verdict: "approve" | "reject" | "needs_review",
  comment?: string,
) {
  const db = getDb();
  const [annotation] = await db
    .insert(annotations)
    .values({ traceId, reviewerId, verdict, comment })
    .returning();

  await appendAuditLog(db, {
    projectId,
    traceId,
    eventType: "annotation.created",
    payload: { verdict, comment: comment ?? null },
  });

  revalidatePath("/review");
  return annotation;
}

export async function issueApiKey(projectId: string, name: string) {
  const db = getDb();
  const { plaintext, prefix, hashed } = generateApiKey();
  await db.insert(apiKeys).values({ projectId, name, prefix, hashedKey: hashed });
  revalidatePath("/settings");
  // Only returned once — the caller must show/copy it immediately, we never store it in plaintext.
  return { plaintext, prefix };
}

export async function revokeApiKey(keyId: string) {
  const db = getDb();
  await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, keyId));
  revalidatePath("/settings");
}
