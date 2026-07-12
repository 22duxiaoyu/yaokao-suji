import path from "node:path";

import * as mock from "@/lib/mock-backend";
import { readStoredFile } from "@/lib/server/object-storage";
import { getMaterial } from "@/lib/server/study-store";

export const runtime = "nodejs";

const mimeByExtension: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
};

function getContentDisposition(fileName: string) {
  const asciiName = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
  return `inline; filename="${asciiName || "material-source"}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function getFallbackSource(name: string) {
  return [
    `资料：${name}`,
    "",
    "当前记录没有可读取的原始附件。真实上传的 PDF、docx 或 txt 会在这里直接打开原文件。"
  ].join("\n");
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const materialId = Number(id);
  const material = await getMaterial(materialId).catch(() => mock.getMaterial(materialId));

  if (!material) {
    return Response.json({ ok: false, error: "Material not found" }, { status: 404 });
  }

  const headers = new Headers({
    "Cache-Control": "private, no-store"
  });

  if (material.sourceType === "upload" && material.fileUrl) {
    try {
      const file = await readStoredFile(material.fileUrl);
      const extension = path.extname(material.name).toLowerCase();

      headers.set("Content-Type", mimeByExtension[extension] ?? "application/octet-stream");
      headers.set("Content-Disposition", getContentDisposition(material.name));

      return new Response(new Uint8Array(file), {
        status: 200,
        headers
      });
    } catch {
      return Response.json({ ok: false, error: "Material source file not found" }, { status: 404 });
    }
  }

  const fallbackName = material.name.endsWith(".txt") ? material.name : `${material.name}.txt`;
  const sourceText = material.rawText?.trim() || getFallbackSource(material.name);

  headers.set("Content-Type", "text/plain; charset=utf-8");
  headers.set("Content-Disposition", getContentDisposition(fallbackName));

  return new Response(sourceText, {
    status: 200,
    headers
  });
}
