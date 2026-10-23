import { describe, expect, it } from "vitest";
import { fitImage, formatLabel, normalizeRotation, placeLabel, visualSize } from "../src/lib/layout";

const box = { x: 10, y: 20, width: 600, height: 800 };

describe("normalizeRotation", () => {
  it("folds any quarter turn into 0, 90, 180 or 270", () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(360)).toBe(0);
  });
});

describe("visualSize", () => {
  it("swaps width and height for sideways pages", () => {
    expect(visualSize(box, 90)).toEqual({ width: 800, height: 600 });
    expect(visualSize(box, 180)).toEqual({ width: 600, height: 800 });
  });
});

describe("placeLabel", () => {
  it("centres a label along the bottom of an upright page", () => {
    expect(placeLabel(box, 0, 40, 10, "bottom-center", 30)).toEqual({ x: 10 + 280, y: 20 + 30, rotate: 0 });
  });

  it("anchors top-right labels inside the margin", () => {
    expect(placeLabel(box, 0, 40, 10, "top-right", 30)).toEqual({ x: 10 + 530, y: 20 + 760, rotate: 0 });
  });

  it("puts the label on the visual bottom of a page turned 90 degrees", () => {
    expect(placeLabel(box, 90, 40, 10, "bottom-center", 30)).toEqual({ x: 10 + 570, y: 20 + 380, rotate: 90 });
  });

  it("puts the label on the visual bottom of an upside-down page", () => {
    expect(placeLabel(box, 180, 40, 10, "bottom-center", 30)).toEqual({ x: 10 + 320, y: 20 + 770, rotate: 180 });
  });

  it("puts the label on the visual bottom of a page turned 270 degrees", () => {
    expect(placeLabel(box, 270, 40, 10, "bottom-center", 30)).toEqual({ x: 10 + 30, y: 20 + 420, rotate: 270 });
  });

  it("keeps a bottom-left label at the visual bottom-left for every rotation", () => {
    const corners = [0, 90, 180, 270].map((r) => placeLabel({ x: 0, y: 0, width: 100, height: 200 }, r, 0, 0, "bottom-left", 0));
    expect(corners).toEqual([
      { x: 0, y: 0, rotate: 0 },
      { x: 100, y: 0, rotate: 90 },
      { x: 100, y: 200, rotate: 180 },
      { x: 0, y: 200, rotate: 270 },
    ]);
  });
});

describe("fitImage", () => {
  it("sizes the page to the image at 96 dpi in fit mode", () => {
    expect(fitImage(960, 480, "fit", 0)).toEqual({ pageWidth: 720, pageHeight: 360, x: 0, y: 0, width: 720, height: 360 });
  });

  it("adds the margin around the image in fit mode", () => {
    expect(fitImage(96, 96, "fit", 10)).toMatchObject({ pageWidth: 92, pageHeight: 92, x: 10, y: 10 });
  });

  it("scales a tall image to fit a letter page and centres it", () => {
    const layout = fitImage(1000, 2000, "letter", 36);
    expect(layout.pageWidth).toBe(612);
    expect(layout.pageHeight).toBe(792);
    expect(layout.height).toBeCloseTo(720);
    expect(layout.width).toBeCloseTo(360);
    expect(layout.x).toBeCloseTo(126);
    expect(layout.y).toBeCloseTo(36);
  });

  it("turns the page sideways for a wide image", () => {
    const layout = fitImage(2000, 1000, "a4", 0);
    expect(layout.pageWidth).toBeCloseTo(841.89);
    expect(layout.pageHeight).toBeCloseTo(595.28);
  });
});

describe("formatLabel", () => {
  it("renders each format", () => {
    expect(formatLabel("n", 3, 9)).toBe("3");
    expect(formatLabel("n-of-total", 3, 9)).toBe("3 of 9");
    expect(formatLabel("page-n", 3, 9)).toBe("Page 3");
  });
});
