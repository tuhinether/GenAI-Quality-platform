import { and, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { apiKeys, getDb, hashApiKey } from "./db";

export async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const db = getDb();
  const hashed = hashApiKey(token);
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.hashedKey, hashed), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (!key) return null;

  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id));
  return key;
}
