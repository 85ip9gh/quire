import { useId, useState } from "react";
import type { PdfItem } from "../hooks/usePdfList";

export function Unlock({ item, onUnlock }: { item: PdfItem; onUnlock: (id: string, password: string) => void }) {
  const [password, setPassword] = useState("");
  const id = useId();

  if (item.status === "error") {
    return (
      <p className="file-problem" role="alert">
        {item.message}
      </p>
    );
  }
  if (item.status !== "locked") return null;

  return (
    <form
      className="unlock"
      onSubmit={(event) => {
        event.preventDefault();
        if (password) onUnlock(item.id, password);
      }}
    >
      <label htmlFor={id}>Password</label>
      <input
        id={id}
        type="password"
        autoComplete="off"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-invalid={Boolean(item.message)}
      />
      <button type="submit" className="button is-small">
        Unlock
      </button>
      {item.message && (
        <span className="file-problem" role="alert">
          {item.message}
        </span>
      )}
    </form>
  );
}

export function statusDetail(item: PdfItem): string | undefined {
  switch (item.status) {
    case "loading":
      return "Reading…";
    case "locked":
      return "Locked";
    case "error":
      return "Unreadable";
    default:
      return `${item.pageCount} page${item.pageCount === 1 ? "" : "s"}${item.wasEncrypted ? ", unlocked" : ""}`;
  }
}
