import { generateCardsForMaterial, parseMaterial } from "@/lib/server/study-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const materialId = Number(id);
    const material = await parseMaterial(materialId);

    if (!material) {
      return Response.json({ ok: false, error: "Material not found" }, { status: 404 });
    }

    return Response.json({
      ok: true,
      material,
      cards: await generateCardsForMaterial(materialId),
      parseJob: {
        status: "success",
        steps: ["读取资料", "拆解药考点", "匹配药学依据", "生成卡片"]
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "资料拆解失败。";

    return Response.json(
      {
        ok: false,
        error: message
      },
      { status: 400 }
    );
  }
}
