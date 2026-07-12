import { getProgressOverview } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    overview: await getProgressOverview()
  });
}
