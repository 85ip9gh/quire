import { type DragEvent, useId, useRef, useState } from "react";

interface DropZoneProps {
  accept: string;
  multiple?: boolean;
  title: string;
  hint: string;
  compact?: boolean;
  onFiles: (files: File[]) => void;
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes("Files");
}

export function DropZone({ accept, multiple = false, title, hint, compact = false, onFiles }: DropZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const hintId = useId();

  return (
    <div
      className={`dropzone${over ? " is-over" : ""}${compact ? " is-compact" : ""}`}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("button")) input.current?.click();
      }}
      onDragEnter={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setOver(false);
        onFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <svg className="dropzone-mark" viewBox="0 0 48 48" aria-hidden="true">
        <rect x="9" y="5" width="24" height="32" rx="3" />
        <rect x="15" y="11" width="24" height="32" rx="3" />
        <path d="M27 22v12M22 29l5 5 5-5" />
      </svg>
      <div className="dropzone-text">
        <button type="button" className="link-button" onClick={() => input.current?.click()} aria-describedby={hintId}>
          {title}
        </button>
        <span id={hintId}>{hint}</span>
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
    </div>
  );
}
