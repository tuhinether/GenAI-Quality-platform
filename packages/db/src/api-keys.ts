import { createHash, randomBytes } from "node:crypto";

export interface GeneratedApiKey {
  plaintext: string;
  prefix: string;
  hashed: string;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `tk_live_${secret}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 12),
    hashed: hashApiKey(plaintext),
  };
}
