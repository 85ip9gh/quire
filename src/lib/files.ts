import { zipSync } from "fflate";

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "document";
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function download(data: Uint8Array | Blob, name: string): void {
  const blob = data instanceof Blob ? data : new Blob([data.slice()], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function zip(entries: { name: string; bytes: Uint8Array }[]): Blob {
  const archive = zipSync(Object.fromEntries(entries.map((entry) => [entry.name, [entry.bytes, { level: 0 }]])));
  return new Blob([archive.slice()], { type: "application/zip" });
}
