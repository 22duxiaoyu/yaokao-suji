import { getKnowledgeNode } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const node = await getKnowledgeNode(Number(id));

  if (!node) {
    return Response.json({ ok: false, error: "Knowledge node not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    node
  });
}
