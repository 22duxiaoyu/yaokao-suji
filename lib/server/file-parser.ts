import path from "node:path";
import { pathToFileURL } from "node:url";

import mammoth from "mammoth";

import type { StudyMaterial } from "@/lib/mock-backend";

type ParsedFile = {
  fileType: NonNullable<StudyMaterial["fileType"]>;
  text: string;
};

let pdfWorkerConfigured = false;

function configurePDFWorker(PDFParse: typeof import("pdf-parse")["PDFParse"]) {
  if (pdfWorkerConfigured) return;

  const workerPath = path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
  PDFParse.setWorker(pathToFileURL(workerPath).href);
  pdfWorkerConfigured = true;
}

function getExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function detectMaterialFileType(fileName: string, mimeType = ""): NonNullable<StudyMaterial["fileType"]> {
  const extension = getExtension(fileName);

  if (extension === "pdf" || mimeType.includes("pdf")) return "pdf";
  if (extension === "docx" || mimeType.includes("wordprocessingml")) return "word";
  if (extension === "txt" || mimeType.startsWith("text/")) return "text";

  return "other";
}

function normalizeParsedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n")
    .trim();
}

async function parsePDF(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  configurePDFWorker(PDFParse);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export async function parseUploadedFile({
  buffer,
  fileName,
  mimeType
}: {
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
}): Promise<ParsedFile> {
  const fileType = detectMaterialFileType(fileName, mimeType);
  let text = "";

  if (fileType === "pdf") {
    text = await parsePDF(buffer);
  } else if (fileType === "word") {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } else if (fileType === "text") {
    text = buffer.toString("utf8");
  } else {
    throw new Error("当前 Demo 先支持 PDF、docx 和 txt。");
  }

  const normalized = normalizeParsedText(text);

  if (normalized.length < 20) {
    throw new Error("没有从文件里解析出足够文本，可能是扫描版 PDF 或图片型资料。");
  }

  return {
    fileType,
    text: normalized
  };
}
