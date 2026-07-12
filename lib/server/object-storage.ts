import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const SUPABASE_SCHEME = "supabase://";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "materials";

  if (!url || !serviceRoleKey) return null;

  return { url, serviceRoleKey, bucket };
}

function getExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? `.${match[1]}` : "";
}

function makeObjectPath(fileName: string) {
  return `demo/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${randomUUID()}${getExtension(fileName)}`;
}

function getLocalUploadRoot() {
  const configured = process.env.UPLOAD_DIR?.trim();

  if (configured && path.isAbsolute(configured)) {
    return path.normalize(configured);
  }

  return path.join(/* turbopackIgnore: true */ process.cwd(), "uploads");
}

function makeSupabaseObjectUrl(url: string, bucket: string, objectPath: string) {
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  return `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;
}

export function isSupabaseFileReference(fileUrl: string) {
  return fileUrl.startsWith(SUPABASE_SCHEME);
}

export function getFileStorageMode() {
  return getSupabaseConfig() ? "supabase" : "local";
}

function parseSupabaseFileReference(fileUrl: string) {
  if (!isSupabaseFileReference(fileUrl)) return null;

  const value = fileUrl.slice(SUPABASE_SCHEME.length);
  const separator = value.indexOf("/");
  if (separator <= 0) return null;

  return {
    bucket: value.slice(0, separator),
    objectPath: value.slice(separator + 1)
  };
}

export async function storeUploadedFile({
  buffer,
  fileName,
  contentType
}: {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
}) {
  const supabase = getSupabaseConfig();

  if (supabase) {
    const objectPath = makeObjectPath(fileName);
    const response = await fetch(makeSupabaseObjectUrl(supabase.url, supabase.bucket, objectPath), {
      method: "POST",
      headers: {
        apikey: supabase.serviceRoleKey,
        Authorization: `Bearer ${supabase.serviceRoleKey}`,
        "Content-Type": contentType || "application/octet-stream",
        "x-upsert": "false"
      },
      body: new Uint8Array(buffer)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`云端文件保存失败：${response.status} ${detail.slice(0, 120)}`);
    }

    return `${SUPABASE_SCHEME}${supabase.bucket}/${objectPath}`;
  }

  const uploadRoot = getLocalUploadRoot();
  const storedName = `${Date.now()}-${randomUUID()}${getExtension(fileName)}`;
  const storedPath = path.join(uploadRoot, storedName);

  await mkdir(uploadRoot, { recursive: true });
  await writeFile(storedPath, buffer);

  return path.relative(process.cwd(), storedPath);
}

export async function readStoredFile(fileUrl: string) {
  const supabaseRef = parseSupabaseFileReference(fileUrl);

  if (supabaseRef) {
    const supabase = getSupabaseConfig();

    if (!supabase) {
      throw new Error("缺少 Supabase Storage 服务端配置。");
    }

    const response = await fetch(makeSupabaseObjectUrl(supabase.url, supabaseRef.bucket, supabaseRef.objectPath), {
      headers: {
        apikey: supabase.serviceRoleKey,
        Authorization: `Bearer ${supabase.serviceRoleKey}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`云端源文件读取失败：${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  const uploadsDirectory = getLocalUploadRoot();
  const sourcePath = path.isAbsolute(fileUrl)
    ? path.normalize(fileUrl)
    : path.join(/* turbopackIgnore: true */ process.cwd(), fileUrl);
  const relativePath = path.relative(uploadsDirectory, sourcePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("无效的资料文件路径。");
  }

  return readFile(sourcePath);
}
