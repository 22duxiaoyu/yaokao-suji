import { detectMaterialFileType } from "@/lib/server/file-parser";
import { storeUploadedFile } from "@/lib/server/object-storage";
import { createUploadedMaterial } from "@/lib/server/study-store";

export const runtime = "nodejs";
export const maxDuration = 60;

function getMaxUploadBytes() {
  const configuredMb = Number(process.env.DEMO_MAX_UPLOAD_MB || 4);
  const safeMb = Number.isFinite(configuredMb) ? Math.min(20, Math.max(1, configuredMb)) : 4;
  return safeMb * 1024 * 1024;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      const fileName = typeof body.fileName === "string" ? body.fileName : "";
      const fileType = detectMaterialFileType(fileName);
      const material = await createUploadedMaterial({
        fileName,
        fileType
      });

      return Response.json({
        ok: true,
        material,
        parseJob: {
          status: "uploaded",
          parserType: "pending"
        }
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: "没有收到文件。" }, { status: 400 });
    }

    const maxUploadBytes = getMaxUploadBytes();

    if (file.size > maxUploadBytes) {
      return Response.json(
        { ok: false, error: `作品集 Demo 单个文件最多 ${Math.round(maxUploadBytes / 1024 / 1024)}MB。` },
        { status: 413 }
      );
    }

    const originalName = file.name || `upload-${Date.now()}`;
    const fileType = detectMaterialFileType(originalName, file.type);

    if (fileType === "other") {
      return Response.json({ ok: false, error: "当前 Demo 先支持 PDF、docx 和 txt。" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await storeUploadedFile({
      buffer,
      fileName: originalName,
      contentType: file.type
    });

    const material = await createUploadedMaterial({
      fileName: originalName,
      fileType,
      fileUrl
    });

    return Response.json({
      ok: true,
      material,
      parseJob: {
        status: "uploaded",
        parserType: "pending"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "资料导入失败。";

    return Response.json(
      {
        ok: false,
        error: message
      },
      { status: 400 }
    );
  }
}
