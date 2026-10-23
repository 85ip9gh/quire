import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker&inline";

let worker: Worker | undefined;

function ensureWorker(): void {
  if (worker) return;
  worker = new PdfWorker();
  GlobalWorkerOptions.workerPort = worker;
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export async function renderThumbnails(
  bytes: Uint8Array,
  targetWidth: number,
  onPage: (index: number, thumbnail: Thumbnail) => void,
  signal: AbortSignal,
): Promise<void> {
  ensureWorker();
  const task = getDocument({ data: bytes.slice(), useWorkerFetch: false, stopAtErrors: false });
  const doc = await task.promise;
  try {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    for (let number = 1; number <= doc.numPages; number++) {
      if (signal.aborted) return;
      const page = await doc.getPage(number);
      const natural = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (targetWidth * ratio) / Math.max(natural.width, natural.height) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      await page.render({ canvas, viewport, intent: "print" }).promise;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
      page.cleanup();
      if (blob && !signal.aborted) {
        onPage(number - 1, { url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height });
      }
    }
  } finally {
    await task.destroy();
  }
}
