import { useEffect, useState } from "react";
import { ActionBar } from "../components/ActionBar";
import { Field } from "../components/Field";
import { PdfPicker } from "../components/PdfPicker";
import { usePdfList } from "../hooks/usePdfList";
import { useTask } from "../hooks/useTask";
import { baseName, download, messageOf } from "../lib/files";
import { type EditableMetadata, type Metadata, readMetadata, stripMetadata, writeMetadata } from "../lib/pdf-ops";

const EDITABLE: { key: keyof EditableMetadata; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "subject", label: "Subject" },
  { key: "keywords", label: "Keywords" },
];

function formatDate(date: Date | undefined): string {
  return date ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not set";
}

export function MetadataTool() {
  const list = usePdfList(true);
  const file = list.ready[0];

  return (
    <div className="tool-body">
      <PdfPicker list={list} />
      {file ? (
        <MetadataEditor key={file.id} name={file.name} bytes={file.bytes} />
      ) : (
        <ActionBar
          label="Save and download"
          busyLabel="Saving…"
          busy={false}
          disabled
          summary="Choose a PDF to see what it says about itself."
          onRun={() => undefined}
        />
      )}
    </div>
  );
}

function MetadataEditor({ name, bytes }: { name: string; bytes: Uint8Array }) {
  const task = useTask();
  const [meta, setMeta] = useState<Metadata>();
  const [fields, setFields] = useState<EditableMetadata>({ title: "", author: "", subject: "", keywords: "" });
  const [readError, setReadError] = useState<string>();

  useEffect(() => {
    let live = true;
    readMetadata(bytes)
      .then((read) => {
        if (!live) return;
        setMeta(read);
        setFields({ title: read.title, author: read.author, subject: read.subject, keywords: read.keywords });
      })
      .catch((error: unknown) => live && setReadError(messageOf(error)));
    return () => {
      live = false;
    };
  }, [bytes]);

  if (readError) return <p className="notice">{readError}</p>;
  if (!meta) return <p className="notice">Reading the document information…</p>;

  const base = baseName(name);
  const edited = EDITABLE.some(({ key }) => fields[key].trim() !== meta[key]);
  const empty = !meta.title && !meta.author && !meta.subject && !meta.keywords && !meta.creator && !meta.producer && !meta.created && !meta.modified && !meta.hasXmp;

  return (
    <>
      <div className="options is-split">
        <div className="options-stack">
          {EDITABLE.map(({ key, label }) => (
            <Field key={key} label={label}>
              {(id) => (
                <input
                  id={id}
                  className="input"
                  value={fields[key]}
                  placeholder="Not set"
                  onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.value }))}
                />
              )}
            </Field>
          ))}
        </div>
        <dl className="facts">
          <div>
            <dt>Made with</dt>
            <dd>{meta.creator || "Not set"}</dd>
          </div>
          <div>
            <dt>Written by</dt>
            <dd>{meta.producer || "Not set"}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDate(meta.created)}</dd>
          </div>
          <div>
            <dt>Modified</dt>
            <dd>{formatDate(meta.modified)}</dd>
          </div>
          <div>
            <dt>XMP packet</dt>
            <dd>{meta.hasXmp ? "Present, may repeat the fields above" : "None"}</dd>
          </div>
        </dl>
      </div>

      <ActionBar
        label="Save fields and download"
        busyLabel="Saving…"
        busy={task.busy}
        disabled={!edited}
        error={task.error}
        done={task.done}
        summary={
          empty
            ? "This file carries no document information."
            : "Software names and dates often reveal more than the title. Strip removes all of it."
        }
        secondary={
          <button
            type="button"
            className="button"
            disabled={task.busy || empty}
            onClick={() =>
              void task.run(async () => {
                const output = await stripMetadata(bytes);
                const fileName = `${base}-clean.pdf`;
                download(output, fileName);
                return `Saved ${fileName} with no document information.`;
              })
            }
          >
            Strip everything
          </button>
        }
        onRun={() =>
          void task.run(async () => {
            const output = await writeMetadata(bytes, fields);
            const fileName = `${base}-edited.pdf`;
            download(output, fileName);
            return `Saved ${fileName}.`;
          })
        }
      />
    </>
  );
}
