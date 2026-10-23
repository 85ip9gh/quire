import { PDFArray, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import {
  PasswordRequiredError,
  UnreadablePdfError,
  WrongPasswordError,
  addPageNumbers,
  extract,
  imagesToPdf,
  merge,
  openPdf,
  organize,
  protect,
  readMetadata,
  split,
  stripMetadata,
  writeMetadata,
} from "../src/lib/pdf-ops";
import { makePdf, makePng, pageRotations, pageWidths, widthOf } from "./fixtures";

describe("merge", () => {
  it("appends every page of each file in the order given", async () => {
    const first = await makePdf(2);
    const second = await makePdf(3, { offset: 10 });
    const merged = await merge([{ bytes: second }, { bytes: first }]);
    expect(await pageWidths(merged)).toEqual([widthOf(10), widthOf(11), widthOf(12), widthOf(0), widthOf(1)]);
  });

  it("takes only the chosen pages from a file", async () => {
    const source = await makePdf(5);
    const merged = await merge([{ bytes: source, pages: [4, 0] }, { bytes: source, pages: [2] }]);
    expect(await pageWidths(merged)).toEqual([widthOf(4), widthOf(0), widthOf(2)]);
  });

  it("refuses to write an empty document", async () => {
    await expect(merge([])).rejects.toThrow(/no pages/);
  });

  it("does not stamp a producer onto the output", async () => {
    const merged = await merge([{ bytes: await makePdf(1) }]);
    expect((await readMetadata(merged)).producer).toBe("");
  });
});

describe("extract and split", () => {
  it("extracts pages into one file", async () => {
    const out = await extract(await makePdf(6), [1, 3, 5]);
    expect(await pageWidths(out)).toEqual([widthOf(1), widthOf(3), widthOf(5)]);
  });

  it("writes one file per group", async () => {
    const files = await split(await makePdf(5), [[0, 1], [2], [3, 4]]);
    expect(files).toHaveLength(3);
    expect(await Promise.all(files.map(pageWidths))).toEqual([
      [widthOf(0), widthOf(1)],
      [widthOf(2)],
      [widthOf(3), widthOf(4)],
    ]);
  });
});

describe("organize", () => {
  it("reorders, drops and turns pages, adding to any existing rotation", async () => {
    const source = await makePdf(4, { rotations: [0, 90, 0, 0] });
    const out = await organize(source, [
      { source: 3, rotate: 0 },
      { source: 1, rotate: 90 },
      { source: 0, rotate: -90 },
    ]);
    expect(await pageWidths(out)).toEqual([widthOf(3), widthOf(1), widthOf(0)]);
    expect(await pageRotations(out)).toEqual([0, 180, 270]);
  });

  it("refuses to drop every page", async () => {
    await expect(organize(await makePdf(2), [])).rejects.toThrow(/at least one page/);
  });
});

describe("imagesToPdf", () => {
  it("makes one page per image, sized to the image in fit mode", async () => {
    const out = await imagesToPdf(
      [
        { bytes: makePng(96, 48), type: "image/png" },
        { bytes: makePng(32, 64), type: "image/png" },
      ],
      { pageSize: "fit", margin: 0 },
    );
    const doc = await PDFDocument.load(out);
    expect(doc.getPages().map((page) => [page.getWidth(), page.getHeight()])).toEqual([
      [72, 36],
      [24, 48],
    ]);
  });

  it("uses a letter page when asked", async () => {
    const out = await imagesToPdf([{ bytes: makePng(10, 20), type: "image/png" }], { pageSize: "letter", margin: 36 });
    const [page] = (await PDFDocument.load(out)).getPages();
    expect([page.getWidth(), page.getHeight()]).toEqual([612, 792]);
  });

  it("refuses an empty list", async () => {
    await expect(imagesToPdf([], { pageSize: "fit", margin: 0 })).rejects.toThrow(/at least one image/);
  });
});

describe("addPageNumbers", () => {
  const options = {
    position: "bottom-center" as const,
    format: "n-of-total" as const,
    start: 1,
    fontSize: 10,
    margin: 24,
    skipFirst: false,
  };

  function hex(text: string): string {
    return `<${Array.from(text, (char) => char.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase()).join("")}>`;
  }

  async function pageText(bytes: Uint8Array): Promise<string[]> {
    const doc = await PDFDocument.load(bytes);
    return doc.getPages().map((page) => {
      const contents = page.node.Contents();
      if (!contents) return "";
      const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
      return refs
        .map((ref) => doc.context.lookup(ref))
        .filter((stream): stream is PDFRawStream => stream instanceof PDFRawStream)
        .map((stream) => new TextDecoder("latin1").decode(decodePDFRawStream(stream).decode()))
        .join("\n");
    });
  }

  it("writes the label for each page and keeps the pages", async () => {
    const out = await addPageNumbers(await makePdf(3), options);
    expect(await pageWidths(out)).toEqual([widthOf(0), widthOf(1), widthOf(2)]);
    const text = await pageText(out);
    expect(text[0]).toContain(hex("1 of 3"));
    expect(text[1]).toContain(hex("2 of 3"));
    expect(text[2]).toContain(hex("3 of 3"));
  });

  it("leaves the first page alone when asked and counts the rest from the start value", async () => {
    const out = await addPageNumbers(await makePdf(3), { ...options, skipFirst: true, start: 5 });
    const text = await pageText(out);
    expect(text[0]).not.toMatch(/Tj/);
    expect(text[1]).toContain(hex("5 of 6"));
    expect(text[2]).toContain(hex("6 of 6"));
  });
});

describe("metadata", () => {
  it("reads the info dictionary", async () => {
    const meta = await readMetadata(await makePdf(1, { title: "Quarterly", author: "Ada" }));
    expect(meta.title).toBe("Quarterly");
    expect(meta.author).toBe("Ada");
  });

  it("sets, keeps and clears fields", async () => {
    const source = await makePdf(1, { title: "Old", author: "Ada" });
    const out = await writeMetadata(source, { title: "New", author: "", subject: "Cover letter", keywords: "" });
    const meta = await readMetadata(out);
    expect(meta).toMatchObject({ title: "New", author: "", subject: "Cover letter", keywords: "" });
    expect(meta.modified).toBeInstanceOf(Date);
  });

  it("strips the info dictionary and the XMP stream", async () => {
    const doc = await PDFDocument.load(await makePdf(1, { title: "Private", author: "Ada" }));
    const xmp = doc.context.flateStream("<x:xmpmeta/>", { Type: "Metadata", Subtype: "XML" });
    doc.catalog.set(PDFName.of("Metadata"), doc.context.register(xmp));
    const withXmp = await doc.save();
    expect((await readMetadata(withXmp)).hasXmp).toBe(true);

    const stripped = await stripMetadata(withXmp);
    const meta = await readMetadata(stripped);
    expect(meta).toMatchObject({ title: "", author: "", producer: "", creator: "", hasXmp: false });
    expect(meta.created).toBeUndefined();
    expect(await pageWidths(stripped)).toEqual([widthOf(0)]);
  });
});

describe("passwords", () => {
  const permissions = { allowPrinting: true, allowCopying: false, allowEditing: false };

  it("opens a plain PDF as-is", async () => {
    const bytes = await makePdf(2);
    const opened = await openPdf(bytes);
    expect(opened).toMatchObject({ pageCount: 2, wasEncrypted: false });
    expect(opened.bytes).toBe(bytes);
  });

  it("rejects bytes that are not a PDF", async () => {
    await expect(openPdf(new TextEncoder().encode("not a pdf"))).rejects.toThrow(UnreadablePdfError);
  });

  it("protects a file, then asks for the password, refuses a wrong one and accepts the right one", async () => {
    const locked = await protect(await makePdf(3), { userPassword: "s3cret", ...permissions });
    const probe = await PDFDocument.load(locked, { ignoreEncryption: true });
    expect(probe.isEncrypted).toBe(true);

    await expect(openPdf(locked)).rejects.toThrow(PasswordRequiredError);
    await expect(openPdf(locked, "nope")).rejects.toThrow(WrongPasswordError);

    const opened = await openPdf(locked, "s3cret");
    expect(opened).toMatchObject({ pageCount: 3, wasEncrypted: true });
    const reopened = await PDFDocument.load(opened.bytes);
    expect(reopened.isEncrypted).toBe(false);
    expect(new TextDecoder("latin1").decode(opened.bytes)).not.toContain("/Encrypt");
    expect(await pageWidths(opened.bytes)).toEqual([widthOf(0), widthOf(1), widthOf(2)]);
  });

  it("opens an owner-only file without asking", async () => {
    const doc = await PDFDocument.load(await makePdf(1));
    doc.encrypt({ userPassword: "", ownerPassword: "owner", permissions: { printing: false } });
    const opened = await openPdf(await doc.save());
    expect(opened).toMatchObject({ pageCount: 1, wasEncrypted: true });
  });

  it("requires a password to protect with", async () => {
    await expect(protect(await makePdf(1), { userPassword: "", ...permissions })).rejects.toThrow(/Choose a password/);
  });
});
