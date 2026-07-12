import { type ReviewResult, submitReviewResult } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = body.result as ReviewResult | undefined;

  if (!result || !["remembered", "fuzzy", "forgotten", "wrong"].includes(result)) {
    return Response.json({ ok: false, error: "Invalid review result" }, { status: 400 });
  }

  const payload = await submitReviewResult(Number(cardId), result);

  if (!payload.card) {
    return Response.json({ ok: false, error: "Card not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    ...payload
  });
}
