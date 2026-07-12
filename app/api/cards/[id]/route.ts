import { type StudyCard, updateCard } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const patch: Partial<StudyCard> = {};

  if (typeof body.question === "string") patch.question = body.question;
  if (typeof body.answer === "string") patch.answer = body.answer;
  if (typeof body.status === "string") patch.status = body.status;
  if (typeof body.isFavorite === "boolean") patch.isFavorite = body.isFavorite;
  if (typeof body.flaggedReason === "string") patch.flaggedReason = body.flaggedReason;

  const card = await updateCard(Number(id), patch);

  if (!card) {
    return Response.json({ ok: false, error: "Card not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    card
  });
}
