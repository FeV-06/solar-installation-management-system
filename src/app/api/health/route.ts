import { db } from "@/server/db";
import { checkHealth } from "@/server/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const health = await checkHealth(() => db.$queryRaw`SELECT 1`);
  if (health.status === "error") {
    return Response.json(
      { error: { code: "DATABASE_UNAVAILABLE", message: "Database is unavailable" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json({ data: health }, { headers: { "Cache-Control": "no-store" } });
}
