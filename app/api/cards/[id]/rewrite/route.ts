import { rewriteCardWithAI } from "@/lib/server/study-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : undefined;
  const card = await rewriteCardWithAI(Number(id), reason);

  if (!card) {
    return Response.json({ ok: false, error: "Card not found or AI rewrite failed" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    card
  });
}
