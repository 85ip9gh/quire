import {
  PDFDict,
  PDFDocument,
  PDFInvalidObject,
  PDFName,
  PDFRef,
  PDFStream,
  StandardFonts,
  degrees,
  rgb,
} from "@cantoo/pdf-lib";
import {
  type NumberFormat,
  type PageSize,
  type Position,
  fitImage,
  formatLabel,
  normalizeRotation,
  placeLabel,
} from "./layout";

export class PasswordRequiredError extends Error {
  constructor() {
    super("This PDF is password protected.");
    this.name = "PasswordRequiredError";
  }
}

export class WrongPasswordError extends Error {
  constructor() {
    super("That password did not open the file.");
    this.name = "WrongPasswordError";
  }
}

export class UnreadablePdfError extends Error {
  constructor() {
    super("This file could not be read as a PDF.");
    this.name = "UnreadablePdfError";
  }
}

export interface OpenedPdf {
  bytes: Uint8Array;
  pageCount: number;
  wasEncrypted: boolean;
}

const LOAD_OPTIONS = { updateMetadata: false } as const;

function load(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, LOAD_OPTIONS);
}

function create(): Promise<PDFDocument> {
  return PDFDocument.create({ updateMetadata: false });
}

function save(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: true });
}

async function decrypt(bytes: Uint8Array, password: string): Promise<PDFDocument | null> {
  try {
    return await PDFDocument.load(bytes, { ...LOAD_OPTIONS, password });
  } catch {
    return null;
  }
}

export async function openPdf(bytes: Uint8Array, password?: string): Promise<OpenedPdf> {
  let probe: PDFDocument;
  try {
    probe = await PDFDocument.load(bytes, { ...LOAD_OPTIONS, ignoreEncryption: true });
  } catch {
    throw new UnreadablePdfError();
  }

  if (!probe.isEncrypted) {
    return { bytes, pageCount: probe.getPageCount(), wasEncrypted: false };
  }

  const doc = (await decrypt(bytes, "")) ?? (password === undefined ? null : await decrypt(bytes, password));
  if (!doc) {
    throw password === undefined ? new PasswordRequiredError() : new WrongPasswordError();
  }
  dropEncryptionLeftovers(doc, probe.context.trailerInfo.Encrypt);
  return { bytes: await save(doc), pageCount: doc.getPageCount(), wasEncrypted: true };
}

const STRUCTURAL_TYPES = new Set([PDFName.of("XRef"), PDFName.of("ObjStm")]);

function dropEncryptionLeftovers(doc: PDFDocument, encryptRef: unknown): void {
  for (const [ref, object] of doc.context.enumerateIndirectObjects()) {
    const type = object instanceof PDFStream ? object.dict.get(PDFName.of("Type")) : undefined;
    const structural = type instanceof PDFName && STRUCTURAL_TYPES.has(type);
    if (structural || object instanceof PDFInvalidObject) doc.context.delete(ref);
  }
  if (encryptRef instanceof PDFRef) doc.context.delete(encryptRef);
}

export async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await load(bytes)).getPageCount();
}

export interface MergeInput {
  bytes: Uint8Array;
  pages?: number[];
}

export async function merge(inputs: MergeInput[]): Promise<Uint8Array> {
  const out = await create();
  for (const input of inputs) {
    const source = await load(input.bytes);
    const copied = await out.copyPages(source, input.pages ?? source.getPageIndices());
    for (const page of copied) out.addPage(page);
  }
  if (out.getPageCount() === 0) throw new Error("There are no pages to write.");
  return save(out);
}

export function extract(bytes: Uint8Array, pages: number[]): Promise<Uint8Array> {
  return merge([{ bytes, pages }]);
}

export async function split(bytes: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const source = await load(bytes);
  const results: Uint8Array[] = [];
  for (const group of groups) {
    const out = await create();
    const copied = await out.copyPages(source, group);
    for (const page of copied) out.addPage(page);
    results.push(await save(out));
  }
  return results;
}

export interface PageEdit {
  source: number;
  rotate: number;
}

export async function organize(bytes: Uint8Array, layout: PageEdit[]): Promise<Uint8Array> {
  if (layout.length === 0) throw new Error("Keep at least one page.");
  const source = await load(bytes);
  const out = await create();
  const copied = await out.copyPages(
    source,
    layout.map((edit) => edit.source),
  );
  copied.forEach((page, index) => {
    const turned = normalizeRotation(page.getRotation().angle + layout[index].rotate);
    page.setRotation(degrees(turned));
    out.addPage(page);
  });
  return save(out);
}

export type ImageType = "image/png" | "image/jpeg";

export interface ImageInput {
  bytes: Uint8Array;
  type: ImageType;
}

export interface ImageOptions {
  pageSize: PageSize;
  margin: number;
}

export async function imagesToPdf(images: ImageInput[], options: ImageOptions): Promise<Uint8Array> {
  if (images.length === 0) throw new Error("Add at least one image.");
  const out = await create();
  for (const image of images) {
    const embedded = image.type === "image/png" ? await out.embedPng(image.bytes) : await out.embedJpg(image.bytes);
    const layout = fitImage(embedded.width, embedded.height, options.pageSize, options.margin);
    const page = out.addPage([layout.pageWidth, layout.pageHeight]);
    page.drawImage(embedded, { x: layout.x, y: layout.y, width: layout.width, height: layout.height });
  }
  return save(out);
}

export interface NumberingOptions {
  position: Position;
  format: NumberFormat;
  start: number;
  fontSize: number;
  margin: number;
  skipFirst: boolean;
}

export async function addPageNumbers(bytes: Uint8Array, options: NumberingOptions): Promise<Uint8Array> {
  const doc = await load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const numbered = options.skipFirst ? pages.slice(1) : pages;
  const total = options.start + numbered.length - 1;
  const textHeight = font.heightAtSize(options.fontSize, { descender: false });

  numbered.forEach((page, index) => {
    const text = formatLabel(options.format, options.start + index, total);
    const textWidth = font.widthOfTextAtSize(text, options.fontSize);
    const place = placeLabel(
      page.getCropBox(),
      page.getRotation().angle,
      textWidth,
      textHeight,
      options.position,
      options.margin,
    );
    page.drawText(text, {
      x: place.x,
      y: place.y,
      size: options.fontSize,
      font,
      color: rgb(0.13, 0.13, 0.13),
      rotate: degrees(place.rotate),
    });
  });

  return save(doc);
}

export interface Metadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  created?: Date;
  modified?: Date;
  hasXmp: boolean;
}

export type EditableMetadata = Pick<Metadata, "title" | "author" | "subject" | "keywords">;

function infoDict(doc: PDFDocument): PDFDict | undefined {
  const ref = doc.context.trailerInfo.Info;
  return ref ? doc.context.lookupMaybe(ref, PDFDict) : undefined;
}

export async function readMetadata(bytes: Uint8Array): Promise<Metadata> {
  const doc = await load(bytes);
  const has = infoDict(doc) !== undefined;
  return {
    title: (has && doc.getTitle()) || "",
    author: (has && doc.getAuthor()) || "",
    subject: (has && doc.getSubject()) || "",
    keywords: (has && doc.getKeywords()) || "",
    creator: (has && doc.getCreator()) || "",
    producer: (has && doc.getProducer()) || "",
    created: has ? doc.getCreationDate() : undefined,
    modified: has ? doc.getModificationDate() : undefined,
    hasXmp: doc.catalog.has(PDFName.of("Metadata")),
  };
}

export async function writeMetadata(bytes: Uint8Array, fields: EditableMetadata): Promise<Uint8Array> {
  const doc = await load(bytes);
  const setters: Record<keyof EditableMetadata, [string, (value: string) => void]> = {
    title: ["Title", (value) => doc.setTitle(value)],
    author: ["Author", (value) => doc.setAuthor(value)],
    subject: ["Subject", (value) => doc.setSubject(value)],
    keywords: ["Keywords", (value) => doc.setKeywords([value])],
  };

  for (const key of Object.keys(setters) as (keyof EditableMetadata)[]) {
    const [name, set] = setters[key];
    const value = fields[key].trim();
    if (value) set(value);
    else infoDict(doc)?.delete(PDFName.of(name));
  }
  doc.setModificationDate(new Date());
  return save(doc);
}

export async function stripMetadata(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await load(bytes);
  doc.context.trailerInfo.Info = undefined;
  doc.catalog.delete(PDFName.of("Metadata"));
  return save(doc);
}

export interface ProtectOptions {
  userPassword: string;
  ownerPassword?: string;
  allowPrinting: boolean;
  allowCopying: boolean;
  allowEditing: boolean;
}

export async function protect(bytes: Uint8Array, options: ProtectOptions): Promise<Uint8Array> {
  if (!options.userPassword) throw new Error("Choose a password to open the file with.");
  const doc = await load(bytes);
  doc.encrypt({
    userPassword: options.userPassword,
    ownerPassword: options.ownerPassword || options.userPassword,
    permissions: {
      printing: options.allowPrinting ? "highResolution" : false,
      copying: options.allowCopying,
      modifying: options.allowEditing,
      annotating: options.allowEditing,
      fillingForms: options.allowEditing,
      documentAssembly: options.allowEditing,
      contentAccessibility: true,
    },
  });
  return save(doc);
}
