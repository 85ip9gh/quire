import { useMemo, useState } from "react";
import { ActionBar } from "../components/ActionBar";
import { DropZone } from "../components/DropZone";
import { Field } from "../components/Field";
import { FileList } from "../components/FileList";
import { Unlock, statusDetail } from "../components/Unlock";
import { usePdfList } from "../hooks/usePdfList";
import { useTask } from "../hooks/useTask";
import { download, messageOf, plural } from "../lib/files";
import { merge } from "../lib/pdf-ops";
import { parseRanges } from "../lib/ranges";

export function MergeTool() {
  const list = usePdfList();
  const task = useTask(list.scope);
  const [ranges, setRanges] = useState<Record<string, string>>({});
  const [name, setName] = useState("merged");

  const selections = useMemo(
    () =>
      list.items.map((item) => {
        const text = ranges[item.id]?.trim() ?? "";
        if (item.status !== "ready" || item.pageCount === undefined) return { count: 0 };
        if (!text) return { count: item.pageCount };
        try {
          const pages = parseRanges(text, item.pageCount).flat();
          return { pages, count: pages.length };
        } catch (error) {
          return { count: 0, error: messageOf(error) };
        }
      }),
    [list.items, ranges],
  );

  const total = selections.reduce((sum, selection) => sum + selection.count, 0);
  const waiting = list.items.some((item) => item.status !== "ready");
  const invalid = selections.some((selection) => "error" in selection && selection.error);
  const fileName = `${name.trim() || "merged"}.pdf`;

  return (
    <div className="tool-body">
      <FileList
        items={list.items.map((item) => ({ ...item, detail: statusDetail(item) }))}
        label="Files in merge order"
        onMove={list.move}
        onRemove={list.remove}
      >
        {(item, index) =>
          item.status === "ready" ? (
            <Field label="Pages" error={selections[index]?.error} hint="Blank takes every page. Try 1-3, 5, 8-end.">
              {(id, describedBy) => (
                <input
                  id={id}
                  className="input is-inline"
                  value={ranges[item.id] ?? ""}
                  placeholder="All pages"
                  aria-describedby={describedBy}
                  onChange={(event) => setRanges((current) => ({ ...current, [item.id]: event.target.value }))}
                />
              )}
            </Field>
          ) : (
            <Unlock item={item} onUnlock={list.unlock} />
          )
        }
      </FileList>

      <DropZone
        accept="application/pdf,.pdf"
        multiple
        compact={list.items.length > 0}
        title={list.items.length > 0 ? "Add more PDFs" : "Choose PDFs to merge"}
        hint={list.items.length > 0 ? "or drop them here" : "or drop them here. Drag rows to set the order."}
        onFiles={(files) => void list.add(files)}
      />
      {list.notice && <p className="notice">{list.notice}</p>}

      {list.items.length > 0 && (
        <div className="options">
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
        label="Merge and download"
        busyLabel="Merging…"
        busy={task.busy}
        disabled={list.items.length === 0 || waiting || invalid || total === 0}
        error={task.error}
        done={task.done}
        summary={
          list.items.length > 0
            ? `${plural(list.items.length, "file")}, ${plural(total, "page")} in the result`
            : "Add two or more PDFs. The first in the list comes first."
        }
        onRun={() =>
          void task.run(async () => {
            const output = await merge(
              list.ready.map((item) => ({
                bytes: item.bytes,
                pages: selections[list.items.indexOf(item)]?.pages,
              })),
            );
            download(output, fileName);
            return `Saved ${fileName}, ${plural(total, "page")}.`;
          })
        }
      />
    </div>
  );
}
