import { approveAllGeneratedCards } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function POST() {
  return Response.json({
    ok: true,
    cards: await approveAllGeneratedCards()
  });
}
