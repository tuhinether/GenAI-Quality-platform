import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/authenticate-request";
import { runExperiment, type RunExperimentInput } from "@/lib/experiments";

export async function POST(req: NextRequest) {
  const key = await authenticateRequest(req);
  if (!key) return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Omit<RunExperimentInput, "projectId"> | null;
  if (!body?.datasetId || !body?.name || !body?.evaluatorNames || !body?.runs) {
    return NextResponse.json(
      { error: "Request body must include datasetId, name, evaluatorNames, runs" },
      { status: 400 },
    );
  }

  const experiment = await runExperiment({ ...body, projectId: key.projectId });
  return NextResponse.json({ experiment });
}
