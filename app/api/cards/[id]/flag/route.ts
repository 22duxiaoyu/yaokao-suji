import { toggleCardFlag } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : undefined;
  const card = await toggleCardFlag(Number(id), reason);

  if (!card) {
    return Response.json({ ok: false, error: "Card not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    card
  });
}
