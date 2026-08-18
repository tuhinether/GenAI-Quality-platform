import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { datasetExamples, datasets, generateApiKey, getDb, apiKeys, orgMembers, orgs, projects } from "@tickmark/db";
import { eq } from "drizzle-orm";
import { FINANCE_QUESTIONS, SOURCE_DOCUMENT } from "./data";
import { loadEnv } from "./env";

loadEnv();

const DEMO_REVIEWER_ID = "00000000-0000-0000-0000-000000000001";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const db = getDb();

  let [org] = await db.select().from(orgs).where(eq(orgs.slug, "tickmark-demo")).limit(1);
  if (!org) {
    [org] = await db.insert(orgs).values({ name: "Tickmark Demo", slug: "tickmark-demo" }).returning();
    console.log(`Created org ${org!.name} (${org!.id})`);
  }
  if (!org) throw new Error("Failed to create org");

  await db
    .insert(orgMembers)
    .values({ orgId: org.id, userId: DEMO_REVIEWER_ID, role: "owner" })
    .onConflictDoNothing();

  let [project] = await db.select().from(projects).where(eq(projects.orgId, org.id)).limit(1);
  if (!project) {
    [project] = await db
      .insert(projects)
      .values({ orgId: org.id, name: "Finance Research Agent", slug: "finance-research-agent" })
      .returning();
    console.log(`Created project ${project!.name} (${project!.id})`);
  }
  if (!project) throw new Error("Failed to create project");

  let [dataset] = await db.select().from(datasets).where(eq(datasets.projectId, project.id)).limit(1);
  if (!dataset) {
    [dataset] = await db
      .insert(datasets)
      .values({
        projectId: project.id,
        name: "Q3 2025 Finance QA",
        description: "Grounding, citation, and compliance checks against Acme Robotics' Q3 2025 10-Q.",
      })
      .returning();
    console.log(`Created dataset ${dataset!.name} (${dataset!.id})`);

    for (const q of FINANCE_QUESTIONS) {
      await db.insert(datasetExamples).values({
        datasetId: dataset!.id,
        input: q.question,
        expectedOutput: q.expectedOutput ?? null,
        metadata: { sourceDocument: SOURCE_DOCUMENT.text, sources: [SOURCE_DOCUMENT], questionId: q.id },
      });
    }
    console.log(`Added ${FINANCE_QUESTIONS.length} dataset examples`);
  }

  const { plaintext, prefix, hashed } = generateApiKey();
  await db.insert(apiKeys).values({ projectId: project.id, name: "demo-agent", prefix, hashedKey: hashed });

  const envLocalPath = path.resolve(__dirname, "../.env.local");
  fs.writeFileSync(
    envLocalPath,
    `TICKMARK_API_KEY=${plaintext}\nTICKMARK_INGEST_URL=http://localhost:3000/api/ingest\n`,
  );

  console.log("\nSeed complete.");
  console.log(`Org:     ${org.name} (${org.id})`);
  console.log(`Project: ${project.name} (${project.id})`);
  console.log(`Dataset: ${dataset!.name} (${dataset!.id})`);
  console.log(`API key: ${plaintext} (written to apps/demo-agent/.env.local)`);
  console.log("\nStart the web app (pnpm dev), then run: pnpm demo");

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
