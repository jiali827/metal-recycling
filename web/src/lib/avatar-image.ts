export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_OUTPUT_SIZE = 256;
export const AVATAR_JPEG_QUALITY = 0.88;
export const AVATAR_ACCEPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AvatarProcessError = "type" | "size" | "decode";

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

/** 居中裁切为正方形并输出 JPEG Data URL（演示环境本地存储） */
export async function processAvatarFile(file: File): Promise<string> {
  if (!AVATAR_ACCEPT_TYPES.includes(file.type as typeof AVATAR_ACCEPT_TYPES[number])) {
    throw new Error("type");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("size");
  }

  const img = await loadImageFromFile(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("decode");

  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
  return canvas.toDataURL("image/jpeg", AVATAR_JPEG_QUALITY);
}

export function parseAvatarProcessError(err: unknown): AvatarProcessError {
  const code = err instanceof Error ? err.message : "";
  if (code === "type" || code === "size" || code === "decode") return code;
  return "decode";
}
