import { describe, expect, it } from "vitest";
import { jpegOrientation } from "../src/lib/exif";

function jpegWithOrientation(value: number, little: boolean): Uint8Array {
  const tiff = new Uint8Array(8 + 2 + 12 + 4);
  const view = new DataView(tiff.buffer);
  view.setUint16(0, little ? 0x4949 : 0x4d4d);
  view.setUint16(2, 42, little);
  view.setUint32(4, 8, little);
  view.setUint16(8, 1, little);
  view.setUint16(10, 0x0112, little);
  view.setUint16(12, 3, little);
  view.setUint32(14, 1, little);
  view.setUint16(18, value, little);

  const app1Length = 2 + 6 + tiff.length;
  const bytes = new Uint8Array(2 + 2 + app1Length + 2);
  const out = new DataView(bytes.buffer);
  out.setUint16(0, 0xffd8);
  out.setUint16(2, 0xffe1);
  out.setUint16(4, app1Length);
  bytes.set([0x45, 0x78, 0x69, 0x66, 0, 0], 6);
  bytes.set(tiff, 12);
  out.setUint16(bytes.length - 2, 0xffd9);
  return bytes;
}

describe("jpegOrientation", () => {
  it("reads the orientation tag in both byte orders", () => {
    expect(jpegOrientation(jpegWithOrientation(6, false))).toBe(6);
    expect(jpegOrientation(jpegWithOrientation(8, true))).toBe(8);
  });

  it("defaults to upright when there is no EXIF block", () => {
    expect(jpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(1);
  });

  it("defaults to upright for bytes that are not a JPEG or are cut short", () => {
    expect(jpegOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(1);
    expect(jpegOrientation(jpegWithOrientation(6, false).slice(0, 20))).toBe(1);
  });

  it("ignores values outside the defined range", () => {
    expect(jpegOrientation(jpegWithOrientation(42, false))).toBe(1);
  });
});
