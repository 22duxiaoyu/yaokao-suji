import { createPastedMaterial } from "@/lib/server/study-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content : "";

  return Response.json({
    ok: true,
    material: await createPastedMaterial(content),
    parseJob: {
      status: "uploaded",
      parserType: "pending"
    }
  });
}
