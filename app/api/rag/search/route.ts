import { searchRag } from "@/lib/server/study-store";

export const runtime = "nodejs";

type RagSearchBody = {
  query?: unknown;
  materialId?: unknown;
  limit?: unknown;
};

export async function POST(request: Request) {
  let body: RagSearchBody = {};

  try {
    body = await request.json() as RagSearchBody;
  } catch {
    body = {};
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  const materialId = typeof body.materialId === "number" ? body.materialId : Number(body.materialId);
  const limit = typeof body.limit === "number" ? body.limit : Number(body.limit);

  if (!query) {
    return Response.json(
      {
        ok: false,
        error: "query is required"
      },
      { status: 400 }
    );
  }

  const result = await searchRag({
    query,
    materialId: Number.isFinite(materialId) ? materialId : undefined,
    limit: Number.isFinite(limit) ? limit : undefined
  });

  return Response.json({
    ok: true,
    ...result
  });
}
