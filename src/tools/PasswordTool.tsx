import { useState } from "react";
import { ActionBar } from "../components/ActionBar";
import { Field } from "../components/Field";
import { PdfPicker } from "../components/PdfPicker";
import { usePdfList } from "../hooks/usePdfList";
import { useTask } from "../hooks/useTask";
import { baseName, download } from "../lib/files";
import { protect } from "../lib/pdf-ops";

export function PasswordTool() {
  const list = usePdfList(true);
  const task = useTask(list.scope);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [owner, setOwner] = useState("");
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [allowEditing, setAllowEditing] = useState(false);

  const file = list.ready[0];
  const locked = list.items[0]?.status === "locked";
  const unlocking = Boolean(file?.wasEncrypted);
  const mismatch = confirm.length > 0 && confirm !== password ? "The passwords do not match." : undefined;

  if (unlocking && file) {
    return (
      <div className="tool-body">
        <PdfPicker list={list} />
        <ActionBar
          label="Download unlocked copy"
          busyLabel="Saving…"
          busy={task.busy}
          error={task.error}
          done={task.done}
          summary="The copy opens without a password and keeps every page."
          onRun={() =>
            void task.run(async () => {
              const name = `${baseName(file.name)}-unlocked.pdf`;
              download(file.bytes, name);
              return `Saved ${name}.`;
            })
          }
        />
      </div>
    );
  }

  return (
    <div className="tool-body">
      <PdfPicker list={list} hint={list.items.length === 0 ? "Drop a protected PDF to unlock it, or a plain one to protect it." : undefined} />

      {file && (
        <div className="options is-split">
          <div className="options-stack">
            <Field label="Password to open">
              {(id) => (
                <input id={id} className="input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              )}
            </Field>
            <Field label="Type it again" error={mismatch}>
              {(id, describedBy) => (
                <input
                  id={id}
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  aria-describedby={describedBy}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              )}
            </Field>
            <Field label="Owner password" hint="Optional. Lifts the restrictions below. Defaults to the open password.">
              {(id, describedBy) => (
                <input
                  id={id}
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={owner}
                  aria-describedby={describedBy}
                  onChange={(event) => setOwner(event.target.value)}
                />
              )}
            </Field>
          </div>
          <fieldset className="choice">
            <legend>Once opened, allow</legend>
            <label className="check">
              <input type="checkbox" checked={allowPrinting} onChange={(event) => setAllowPrinting(event.target.checked)} />
              <span>Printing</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={allowCopying} onChange={(event) => setAllowCopying(event.target.checked)} />
              <span>Copying text and images</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={allowEditing} onChange={(event) => setAllowEditing(event.target.checked)} />
              <span>Editing, comments and form filling</span>
            </label>
            <p className="field-hint">
              Viewers are trusted to honour these. The password itself is enforced by AES-256 encryption.
            </p>
          </fieldset>
        </div>
      )}

      <ActionBar
        label="Protect and download"
        busyLabel="Encrypting…"
        busy={task.busy}
        disabled={!file || !password || password !== confirm}
        error={task.error}
        done={task.done}
        summary={
          locked
            ? "Enter the file's password above to unlock it."
            : file
              ? "There is no way to recover a forgotten password."
              : "Choose a PDF."
        }
        onRun={() =>
          void task.run(async () => {
            if (!file) return;
            const output = await protect(file.bytes, {
              userPassword: password,
              ownerPassword: owner || undefined,
              allowPrinting,
              allowCopying,
              allowEditing,
            });
            const name = `${baseName(file.name)}-protected.pdf`;
            download(output, name);
            return `Saved ${name}.`;
          })
        }
      />
    </div>
  );
}
