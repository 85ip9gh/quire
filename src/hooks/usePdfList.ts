import { useCallback, useState } from "react";
import { isPdf, messageOf, plural } from "../lib/files";
import { PasswordRequiredError, WrongPasswordError, openPdf } from "../lib/pdf-ops";

export type PdfStatus = "loading" | "ready" | "locked" | "error";

export interface PdfItem {
  id: string;
  name: string;
  size: number;
  raw: Uint8Array;
  status: PdfStatus;
  bytes?: Uint8Array;
  pageCount?: number;
  wasEncrypted: boolean;
  message?: string;
}

let counter = 0;

function skippedNotice(skipped: number, single: boolean): string | undefined {
  if (skipped === 0) return undefined;
  if (single) return `Only one PDF is used here, so ${plural(skipped, "other file")} ${skipped === 1 ? "was" : "were"} skipped.`;
  return skipped === 1 ? "Skipped 1 file that is not a PDF." : `Skipped ${skipped} files that are not PDFs.`;
}

function nextId(): string {
  counter += 1;
  return `pdf-${counter}`;
}

export function usePdfList(single = false) {
  const [items, setItems] = useState<PdfItem[]>([]);
  const [notice, setNotice] = useState<string>();

  const update = useCallback((id: string, patch: Partial<PdfItem>) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const open = useCallback(
    async (item: PdfItem, password?: string) => {
      try {
        const opened = await openPdf(item.raw, password);
        update(item.id, {
          status: "ready",
          bytes: opened.bytes,
          pageCount: opened.pageCount,
          wasEncrypted: opened.wasEncrypted,
          message: undefined,
        });
      } catch (error) {
        if (error instanceof PasswordRequiredError) {
          update(item.id, { status: "locked", wasEncrypted: true });
        } else if (error instanceof WrongPasswordError) {
          update(item.id, { status: "locked", wasEncrypted: true, message: error.message });
        } else {
          update(item.id, { status: "error", message: messageOf(error) });
        }
      }
    },
    [update],
  );

  const add = useCallback(
    async (files: File[]) => {
      const pdfs = files.filter(isPdf);
      const chosen = single ? pdfs.slice(0, 1) : pdfs;
      const skipped = files.length - chosen.length;
      setNotice(skippedNotice(skipped, single));

      const fresh = await Promise.all(
        chosen.map(
          async (file): Promise<PdfItem> => ({
            id: nextId(),
            name: file.name,
            size: file.size,
            raw: new Uint8Array(await file.arrayBuffer()),
            status: "loading",
            wasEncrypted: false,
          }),
        ),
      );
      setItems((list) => (single ? fresh : [...list, ...fresh]));
      await Promise.all(fresh.map((item) => open(item)));
    },
    [open, single],
  );

  const unlock = useCallback(
    (id: string, password: string) => {
      const item = items.find((candidate) => candidate.id === id);
      if (item) void open(item, password);
    },
    [items, open],
  );

  const remove = useCallback((id: string) => {
    setItems((list) => list.filter((item) => item.id !== id));
  }, []);

  const move = useCallback((from: number, to: number) => {
    setItems((list) => {
      if (to < 0 || to >= list.length || from === to) return list;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const ready = items.filter((item): item is PdfItem & { bytes: Uint8Array; pageCount: number } => item.status === "ready");

  const scope = items.map((item) => item.id).join(",");

  return { items, ready, notice, scope, add, unlock, remove, move };
}
