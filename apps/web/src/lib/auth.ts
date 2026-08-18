import { eq } from "drizzle-orm";
import { getDb, orgMembers, projects, orgs } from "./db";
import { getSupabaseServerClient } from "./supabase/server";

export interface ActiveProject {
  project: typeof projects.$inferSelect;
  org: typeof orgs.$inferSelect;
  mode: "authenticated" | "demo";
}

/**
 * Resolves the project the current request should operate on. When Supabase
 * auth is configured and a session exists, scopes to the signed-in user's
 * first org/project. Otherwise falls back to the first project in the
 * database so the dashboard is browsable locally without setting up auth
 * (see README "Demo mode").
 */
export async function getActiveProject(): Promise<ActiveProject | null> {
  const db = getDb();
  const supabase = await getSupabaseServerClient();

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const [membership] = await db
        .select()
        .from(orgMembers)
        .where(eq(orgMembers.userId, user.id))
        .limit(1);

      if (membership) {
        const [org] = await db.select().from(orgs).where(eq(orgs.id, membership.orgId)).limit(1);
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.orgId, membership.orgId))
          .limit(1);
        if (org && project) return { org, project, mode: "authenticated" };
      }
    }
  }

  const [project] = await db.select().from(projects).limit(1);
  if (!project) return null;
  const [org] = await db.select().from(orgs).where(eq(orgs.id, project.orgId)).limit(1);
  if (!org) return null;
  return { org, project, mode: "demo" };
}
