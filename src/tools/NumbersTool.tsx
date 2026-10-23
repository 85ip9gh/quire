import { useState } from "react";
import { ActionBar } from "../components/ActionBar";
import { Choice, Field } from "../components/Field";
import { PdfPicker } from "../components/PdfPicker";
import { usePdfList } from "../hooks/usePdfList";
import { useTask } from "../hooks/useTask";
import { baseName, download, plural } from "../lib/files";
import { type NumberFormat, type Position, formatLabel } from "../lib/layout";
import { addPageNumbers } from "../lib/pdf-ops";

const POSITIONS: { value: Position; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top centre" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom centre" },
  { value: "bottom-right", label: "Bottom right" },
];

type Margin = "18" | "28" | "40";

export function NumbersTool() {
  const list = usePdfList(true);
  const task = useTask(list.scope);
  const [position, setPosition] = useState<Position>("bottom-center");
  const [format, setFormat] = useState<NumberFormat>("n");
  const [start, setStart] = useState("1");
  const [fontSize, setFontSize] = useState("10");
  const [margin, setMargin] = useState<Margin>("28");
  const [skipFirst, setSkipFirst] = useState(false);

  const file = list.ready[0];
  const startNumber = Number(start);
  const startError = Number.isInteger(startNumber) && startNumber >= 0 ? undefined : "Use a whole number.";
  const numbered = file ? file.pageCount - (skipFirst ? 1 : 0) : 0;
  const sample = formatLabel(format, startError ? 1 : startNumber, (startError ? 1 : startNumber) + Math.max(numbered, 1) - 1);

  return (
    <div className="tool-body">
      <PdfPicker list={list} />

      {file && (
        <div className="options is-split">
          <fieldset className="position-picker">
            <legend>Where</legend>
            <div className="position-page">
              {POSITIONS.map((option) => (
                <label key={option.value} className={`position-slot is-${option.value}${option.value === position ? " is-checked" : ""}`}>
                  <input
                    type="radio"
                    name="number-position"
                    value={option.value}
                    checked={option.value === position}
                    onChange={() => setPosition(option.value)}
                    aria-label={option.label}
                  />
                  <span style={{ fontSize: `${Math.max(9, Number(fontSize))}px` }}>{option.value === position ? sample : ""}</span>
                </label>
              ))}
              <span className="position-lines" aria-hidden="true" />
            </div>
          </fieldset>

          <div className="options-stack">
            <Choice<NumberFormat>
              legend="Label"
              name="number-format"
              value={format}
              onChange={setFormat}
              options={[
                { value: "n", label: "3" },
                { value: "n-of-total", label: "3 of 12" },
                { value: "page-n", label: "Page 3" },
              ]}
            />
            <div className="field-row">
              <Field label="First number" error={startError}>
                {(id, describedBy) => (
                  <input
                    id={id}
                    className="input is-short"
                    type="number"
                    min={0}
                    value={start}
                    aria-describedby={describedBy}
                    onChange={(event) => setStart(event.target.value)}
                  />
                )}
              </Field>
              <Field label="Text size">
                {(id) => (
                  <select id={id} className="input is-short" value={fontSize} onChange={(event) => setFontSize(event.target.value)}>
                    {["8", "9", "10", "11", "12", "14", "16"].map((size) => (
                      <option key={size} value={size}>
                        {size} pt
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <Choice<Margin>
              legend="Distance from edge"
              name="number-margin"
              value={margin}
              onChange={setMargin}
              options={[
                { value: "18", label: "Close" },
                { value: "28", label: "Normal" },
                { value: "40", label: "Far" },
              ]}
            />
            <label className="check">
              <input type="checkbox" checked={skipFirst} onChange={(event) => setSkipFirst(event.target.checked)} />
              <span>Leave the first page unnumbered, for a cover or title page</span>
            </label>
          </div>
        </div>
      )}

      <ActionBar
        label="Add numbers and download"
        busyLabel="Numbering…"
        busy={task.busy}
        disabled={!file || Boolean(startError) || numbered < 1}
        error={task.error}
        done={task.done}
        summary={file ? `Numbers ${plural(numbered, "page")}. Turned pages get the label on their visual edge.` : "Choose a PDF to number."}
        onRun={() =>
          void task.run(async () => {
            if (!file) return;
            const output = await addPageNumbers(file.bytes, {
              position,
              format,
              start: startNumber,
              fontSize: Number(fontSize),
              margin: Number(margin),
              skipFirst,
            });
            const name = `${baseName(file.name)}-numbered.pdf`;
            download(output, name);
            return `Saved ${name}.`;
          })
        }
      />
    </div>
  );
}
