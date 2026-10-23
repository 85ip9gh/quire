import { type ReactNode, useState } from "react";
import { formatBytes } from "../lib/files";
import { Icon } from "./Icon";

export interface ListEntry {
  id: string;
  name: string;
  size: number;
  detail?: ReactNode;
  thumb?: string;
}

interface FileListProps<T extends ListEntry> {
  items: T[];
  label: string;
  onMove?: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  children?: (item: T, index: number) => ReactNode;
}

export function FileList<T extends ListEntry>({ items, label, onMove, onRemove, children }: FileListProps<T>) {
  const [dragging, setDragging] = useState<number>();
  const [target, setTarget] = useState<number>();

  if (items.length === 0) return null;

  return (
    <ol className="file-list" aria-label={label}>
      {items.map((item, index) => (
        <li
          key={item.id}
          className={`file-row${dragging === index ? " is-dragging" : ""}${target === index && dragging !== index ? " is-target" : ""}`}
          draggable={Boolean(onMove)}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", item.id);
            setDragging(index);
          }}
          onDragOver={(event) => {
            if (dragging === undefined) return;
            event.preventDefault();
            setTarget(index);
          }}
          onDrop={(event) => {
            if (dragging === undefined) return;
            event.preventDefault();
            onMove?.(dragging, index);
            setDragging(undefined);
            setTarget(undefined);
          }}
          onDragEnd={() => {
            setDragging(undefined);
            setTarget(undefined);
          }}
        >
          {onMove && (
            <span className="file-grip" aria-hidden="true">
              <Icon name="grip" />
            </span>
          )}
          {item.thumb ? (
            <img className="file-thumb" src={item.thumb} alt="" draggable={false} />
          ) : (
            <span className="file-index" aria-hidden="true">
              {index + 1}
            </span>
          )}
          <div className="file-main">
            <span className="file-name" title={item.name}>
              {item.name}
            </span>
            <span className="file-meta">
              {formatBytes(item.size)}
              {item.detail && <> · {item.detail}</>}
            </span>
            {children?.(item, index)}
          </div>
          <div className="file-actions">
            {onMove && (
              <>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onMove(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move ${item.name} up`}
                >
                  <Icon name="up" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onMove(index, index + 1)}
                  disabled={index === items.length - 1}
                  aria-label={`Move ${item.name} down`}
                >
                  <Icon name="down" />
                </button>
              </>
            )}
            <button
              type="button"
              className="icon-button"
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${item.name}`}
            >
              <Icon name="close" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
