import { useMemo, useState } from "react";
import { ActionBar } from "../components/ActionBar";
import { Choice, Field } from "../components/Field";
import { PdfPicker } from "../components/PdfPicker";
import { usePdfList } from "../hooks/usePdfList";
import { useTask } from "../hooks/useTask";
import { baseName, download, messageOf, plural, zip } from "../lib/files";
import { extract, split } from "../lib/pdf-ops";
import { chunk, describeGroup, parseRanges } from "../lib/ranges";

type Mode = "ranges" | "extract" | "every";

export function SplitTool() {
  const list = usePdfList(true);
  const task = useTask(list.scope);
  const [mode, setMode] = useState<Mode>("ranges");
  const [ranges, setRanges] = useState("");
  const [every, setEvery] = useState("1");

  const file = list.ready[0];

  const plan = useMemo(() => {
    if (!file) return { groups: [] as number[][] };
    try {
      if (mode === "every") return { groups: chunk(file.pageCount, Number(every)) };
      if (!ranges.trim()) return { groups: [] as number[][] };
      const groups = parseRanges(ranges, file.pageCount);
      return { groups: mode === "extract" ? [groups.flat()] : groups };
    } catch (error) {
      return { groups: [] as number[][], error: messageOf(error) };
    }
  }, [file, mode, ranges, every]);

  const pages = plan.groups.reduce((sum, group) => sum + group.length, 0);
  const shown = plan.groups.slice(0, 8).map(describeGroup).join(", ");
  const summary =
    plan.groups.length === 0
      ? file
        ? `${file.name} has ${plural(file.pageCount, "page")}.`
        : "Choose a PDF to split."
      : plan.groups.length === 1
        ? `One file with ${plural(pages, "page")}.`
        : `${plan.groups.length} files: ${shown}${plan.groups.length > 8 ? ", …" : ""}`;

  return (
    <div className="tool-body">
      <PdfPicker list={list} />

      {file && (
        <div className="options">
          <Choice<Mode>
            legend="How to split"
            name="split-mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "ranges", label: "One file per range", hint: "1-3, 4-6 gives two files" },
              { value: "extract", label: "Pull pages into one file", hint: "1, 4, 9-end gives one file" },
              { value: "every", label: "Every few pages", hint: "Fixed-size pieces" },
            ]}
          />
          {mode === "every" ? (
            <Field label="Pages per file" error={plan.error}>
              {(id, describedBy) => (
                <input
                  id={id}
                  className="input is-short"
                  type="number"
                  min={1}
                  max={file.pageCount}
                  value={every}
                  aria-describedby={describedBy}
                  onChange={(event) => setEvery(event.target.value)}
                />
              )}
            </Field>
          ) : (
            <Field label="Pages" error={plan.error} hint="Separate ranges with commas. end means the last page.">
              {(id, describedBy) => (
                <input
                  id={id}
                  className="input"
                  value={ranges}
                  placeholder="1-3, 5, 8-end"
                  aria-describedby={describedBy}
                  onChange={(event) => setRanges(event.target.value)}
                />
              )}
            </Field>
          )}
        </div>
      )}

      <ActionBar
        label={plan.groups.length > 1 ? "Split and download .zip" : "Split and download"}
        busyLabel="Splitting…"
        busy={task.busy}
        disabled={!file || plan.groups.length === 0}
        error={task.error}
        done={task.done}
        summary={summary}
        onRun={() =>
          void task.run(async () => {
            if (!file) return;
            const base = baseName(file.name);
            if (plan.groups.length === 1) {
              const output = await extract(file.bytes, plan.groups[0]);
              const name = mode === "extract" ? `${base}-extracted.pdf` : `${base}-${describeGroup(plan.groups[0])}.pdf`;
              download(output, name);
              return `Saved ${name}.`;
            }
            const outputs = await split(file.bytes, plan.groups);
            const name = `${base}-split.zip`;
            download(
              zip(outputs.map((bytes, index) => ({ name: `${base}-${describeGroup(plan.groups[index])}.pdf`, bytes }))),
              name,
            );
            return `Saved ${name} with ${plural(outputs.length, "file")}.`;
          })
        }
      />
    </div>
  );
}
