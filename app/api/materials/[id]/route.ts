import { getMaterial } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const material = await getMaterial(Number(id));

  if (!material) {
    return Response.json({ ok: false, error: "Material not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    material
  });
}
