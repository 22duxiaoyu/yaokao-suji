import { getProgressOverview } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function GET() {
  const overview = await getProgressOverview();

  return Response.json({
    ok: true,
    weekPlan: overview.weekPlan,
    strategy: "ai-adjusted-sm2-mock"
  });
}
