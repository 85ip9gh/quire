import { useEffect, useRef, useState } from "react";
import { ActionBar } from "../components/ActionBar";
import { DropZone } from "../components/DropZone";
import { Choice, Field } from "../components/Field";
import { FileList } from "../components/FileList";
import { useTask } from "../hooks/useTask";
import { download, plural } from "../lib/files";
import { IMAGE_ACCEPT, isImage, toEmbeddable } from "../lib/images";
import type { PageSize } from "../lib/layout";
import { imagesToPdf } from "../lib/pdf-ops";

interface ImageItem {
  id: string;
  name: string;
  size: number;
  file: File;
  thumb: string;
}

type Margin = "0" | "18" | "36";

let counter = 0;

export function ImagesTool() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const task = useTask(items.map((item) => item.id).join(","));
  const [notice, setNotice] = useState<string>();
  const [pageSize, setPageSize] = useState<PageSize>("letter");
  const [margin, setMargin] = useState<Margin>("18");
  const [name, setName] = useState("images");
  const urls = useRef(new Set<string>());

  useEffect(() => {
    const owned = urls.current;
    return () => {
      for (const url of owned) URL.revokeObjectURL(url);
    };
  }, []);

  const add = (files: File[]) => {
    const images = files.filter(isImage);
    const skipped = files.length - images.length;
    setNotice(
      skipped === 0
        ? undefined
        : skipped === 1
          ? "Skipped 1 file that is not an image."
          : `Skipped ${skipped} files that are not images.`,
    );
    const fresh = images.map((file) => {
      counter += 1;
      const thumb = URL.createObjectURL(file);
      urls.current.add(thumb);
      return { id: `image-${counter}`, name: file.name, size: file.size, file, thumb };
    });
    setItems((current) => [...current, ...fresh]);
  };

  const remove = (id: string) => {
    const gone = items.find((item) => item.id === id);
    if (gone) {
      URL.revokeObjectURL(gone.thumb);
      urls.current.delete(gone.thumb);
    }
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const move = (from: number, to: number) =>
    setItems((current) => {
      if (to < 0 || to >= current.length || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const fileName = `${name.trim() || "images"}.pdf`;

  return (
    <div className="tool-body">
      <FileList items={items} label="Images in page order" onMove={move} onRemove={remove} />
      <DropZone
        accept={IMAGE_ACCEPT}
        multiple
        compact={items.length > 0}
        title={items.length > 0 ? "Add more images" : "Choose images"}
        hint={items.length > 0 ? "or drop them here" : "JPG, PNG, WebP, GIF, BMP or AVIF. Each becomes one page."}
        onFiles={add}
      />
      {notice && <p className="notice">{notice}</p>}

      {items.length > 0 && (
        <div className="options">
          <Choice<PageSize>
            legend="Page size"
            name="image-page-size"
            value={pageSize}
            onChange={setPageSize}
            options={[
              { value: "letter", label: "Letter", hint: "8.5 × 11 in" },
              { value: "a4", label: "A4", hint: "210 × 297 mm" },
              { value: "fit", label: "Match each image", hint: "No resizing" },
            ]}
          />
          <Choice<Margin>
            legend="Margin"
            name="image-margin"
            value={margin}
            onChange={setMargin}
            options={[
              { value: "0", label: "None" },
              { value: "18", label: "Narrow", hint: "¼ in" },
              { value: "36", label: "Normal", hint: "½ in" },
            ]}
          />
          <Field label="Save as">
            {(id) => (
              <span className="input-suffix">
                <input id={id} className="input" value={name} onChange={(event) => setName(event.target.value)} />
                <span>.pdf</span>
              </span>
            )}
          </Field>
        </div>
      )}

      <ActionBar
        label="Make PDF and download"
        busyLabel="Converting…"
        busy={task.busy}
        disabled={items.length === 0}
        error={task.error}
        done={task.done}
        summary={
          items.length > 0
            ? pageSize === "fit"
              ? `${plural(items.length, "page")}, each sized to its image`
              : `${plural(items.length, "page")}, wide images get landscape pages`
            : "Phone photos are turned upright using their orientation tag."
        }
        onRun={() =>
          void task.run(async () => {
            const images = await Promise.all(items.map((item) => toEmbeddable(item.file)));
            const output = await imagesToPdf(images, { pageSize, margin: Number(margin) });
            download(output, fileName);
            return `Saved ${fileName}, ${plural(items.length, "page")}.`;
          })
        }
      />
    </div>
  );
}
