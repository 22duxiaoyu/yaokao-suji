import { generateCardsForMaterial, getMaterial } from "@/lib/server/study-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const materialId = Number(id);
  const material = await getMaterial(materialId);

  if (!material) {
    return Response.json({ ok: false, error: "Material not found" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    material,
    cards: await generateCardsForMaterial(materialId)
  });
}
