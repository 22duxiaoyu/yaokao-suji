import { createAIProbe, type ReviewResult } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const cardId = Number(body.cardId);
  const triggerResult = body.triggerResult as ReviewResult | undefined;

  if (!cardId || !triggerResult) {
    return Response.json({ ok: false, error: "Missing cardId or triggerResult" }, { status: 400 });
  }

  const probe = await createAIProbe(cardId, triggerResult);

  if (!probe) {
    return Response.json({ ok: false, error: "Card not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    probe
  });
}
