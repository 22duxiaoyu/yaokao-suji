import { getProgressOverview } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function GET() {
  const overview = await getProgressOverview();

  return Response.json({
    ok: true,
    retention: {
      stability: overview.stability,
      cardCount: overview.cardCount,
      flaggedCount: overview.flaggedCount
    }
  });
}
