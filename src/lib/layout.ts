export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Position =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "top-left"
  | "top-center"
  | "top-right";

export interface Placement {
  x: number;
  y: number;
  rotate: number;
}

export function normalizeRotation(angle: number): number {
  return ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
}

export function visualSize(box: Box, rotation: number): { width: number; height: number } {
  const quarter = normalizeRotation(rotation) % 180 !== 0;
  return quarter ? { width: box.height, height: box.width } : { width: box.width, height: box.height };
}

export function placeLabel(
  box: Box,
  rotation: number,
  textWidth: number,
  textHeight: number,
  position: Position,
  margin: number,
): Placement {
  const r = normalizeRotation(rotation);
  const { width, height } = visualSize(box, r);
  const [vertical, horizontal] = position.split("-") as ["top" | "bottom", "left" | "center" | "right"];

  const u =
    horizontal === "left" ? margin : horizontal === "right" ? width - margin - textWidth : (width - textWidth) / 2;
  const v = vertical === "bottom" ? margin : height - margin - textHeight;

  switch (r) {
    case 90:
      return { x: box.x + box.width - v, y: box.y + u, rotate: 90 };
    case 180:
      return { x: box.x + box.width - u, y: box.y + box.height - v, rotate: 180 };
    case 270:
      return { x: box.x + v, y: box.y + box.height - u, rotate: 270 };
    default:
      return { x: box.x + u, y: box.y + v, rotate: 0 };
  }
}

export const PAGE_SIZES = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 },
} as const;

export type PageSize = keyof typeof PAGE_SIZES | "fit";

export interface ImageLayout {
  pageWidth: number;
  pageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const POINTS_PER_PIXEL = 72 / 96;

export function fitImage(imageWidth: number, imageHeight: number, size: PageSize, margin: number): ImageLayout {
  if (size === "fit") {
    const width = imageWidth * POINTS_PER_PIXEL;
    const height = imageHeight * POINTS_PER_PIXEL;
    return { pageWidth: width + margin * 2, pageHeight: height + margin * 2, x: margin, y: margin, width, height };
  }

  const base = PAGE_SIZES[size];
  const landscape = imageWidth > imageHeight;
  const pageWidth = landscape ? base.height : base.width;
  const pageHeight = landscape ? base.width : base.height;
  const boxWidth = pageWidth - margin * 2;
  const boxHeight = pageHeight - margin * 2;
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

export type NumberFormat = "n" | "n-of-total" | "page-n";

export function formatLabel(format: NumberFormat, n: number, total: number): string {
  switch (format) {
    case "n-of-total":
      return `${n} of ${total}`;
    case "page-n":
      return `Page ${n}`;
    default:
      return String(n);
  }
}
