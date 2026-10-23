import { jpegOrientation } from "./exif";
import type { ImageInput } from "./pdf-ops";

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif";

export function isImage(file: File): boolean {
  return file.type.startsWith("image/") && file.type !== "image/svg+xml";
}

async function reencode(file: Blob, type: "image/png" | "image/jpeg"): Promise<ImageInput> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw images.");
  if (type === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
  if (!blob) throw new Error("This image could not be converted.");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type };
}

export async function toEmbeddable(file: File): Promise<ImageInput> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/jpeg") {
    return jpegOrientation(bytes) === 1 ? { bytes, type: "image/jpeg" } : reencode(file, "image/jpeg");
  }
  if (file.type === "image/png") return { bytes, type: "image/png" };
  return reencode(file, "image/png");
}
