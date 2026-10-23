import { useEffect, useState } from "react";
import { ActionBar } from "../components/ActionBar";
import { Icon } from "../components/Icon";
import { PdfPicker } from "../components/PdfPicker";
import { usePdfList } from "../hooks/usePdfList";
import { useTask } from "../hooks/useTask";
import { baseName, download, messageOf, plural } from "../lib/files";
import { normalizeRotation } from "../lib/layout";
import { organize } from "../lib/pdf-ops";
import { type Thumbnail, renderThumbnails } from "../lib/preview";

interface Card {
  source: number;
  rotate: number;
  removed: boolean;
}

function initialCards(count: number): Card[] {
  return Array.from({ length: count }, (_, source) => ({ source, rotate: 0, removed: false }));
}

export function OrganizeTool() {
  const list = usePdfList(true);
  const file = list.ready[0];

  return (
    <div className="tool-body">
      <PdfPicker list={list} />
      {file ? (
        <PageEditor key={file.id} name={file.name} bytes={file.bytes} count={file.pageCount} />
      ) : (
        <ActionBar
          label="Save and download"
          busyLabel="Saving…"
          busy={false}
          disabled
          summary="Choose a PDF to reorder, turn or remove its pages."
          onRun={() => undefined}
        />
      )}
    </div>
  );
}

function PageEditor({ name, bytes, count }: { name: string; bytes: Uint8Array; count: number }) {
  const task = useTask();
  const [cards, setCards] = useState<Card[]>(() => initialCards(count));
  const [thumbs, setThumbs] = useState<Record<number, Thumbnail>>({});
  const [previewError, setPreviewError] = useState<string>();
  const [dragging, setDragging] = useState<number>();

  useEffect(() => {
    const controller = new AbortController();
    const urls: string[] = [];
    renderThumbnails(
      bytes,
      180,
      (index, thumbnail) => {
        urls.push(thumbnail.url);
        setThumbs((current) => ({ ...current, [index]: thumbnail }));
      },
      controller.signal,
    ).catch((error: unknown) => {
      if (!controller.signal.aborted) setPreviewError(`Previews are unavailable: ${messageOf(error)}`);
    });

    return () => {
      controller.abort();
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [bytes]);

  const update = (index: number, patch: Partial<Card>) =>
    setCards((current) => current.map((card, position) => (position === index ? { ...card, ...patch } : card)));

  const move = (from: number, to: number) =>
    setCards((current) => {
      if (to < 0 || to >= current.length || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const turnAll = (delta: number) =>
    setCards((current) => current.map((card) => ({ ...card, rotate: card.rotate + delta })));

  const kept = cards.filter((card) => !card.removed);
  const removed = cards.length - kept.length;
  const turned = kept.filter((card) => normalizeRotation(card.rotate) !== 0).length;
  const moved = kept.some((card, index) => card.source !== index) || removed > 0;
  const changed = removed > 0 || turned > 0 || moved;

  return (
    <>
      {cards.length > 0 && (
        <>
          <div className="toolbar" role="toolbar" aria-label="Whole document">
            <button type="button" className="button" onClick={() => turnAll(-90)}>
              <Icon name="rotateLeft" size={18} /> Turn all left
            </button>
            <button type="button" className="button" onClick={() => turnAll(90)}>
              <Icon name="rotateRight" size={18} /> Turn all right
            </button>
            <button type="button" className="button" onClick={() => setCards((current) => [...current].reverse())}>
              Reverse order
            </button>
            <button type="button" className="button is-quiet" onClick={() => setCards(initialCards(count))} disabled={!changed}>
              <Icon name="restore" size={18} /> Reset
            </button>
          </div>
          {previewError && <p className="notice">{previewError}</p>}

          <ol className="page-grid" aria-label="Pages in output order">
            {cards.map((card, index) => {
              const thumb = thumbs[card.source];
              const label = `Page ${card.source + 1}`;
              return (
                <li
                  key={card.source}
                  className={`page-card${card.removed ? " is-removed" : ""}${dragging === index ? " is-dragging" : ""}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(card.source));
                    setDragging(index);
                  }}
                  onDragOver={(event) => {
                    if (dragging === undefined) return;
                    event.preventDefault();
                    if (dragging !== index) {
                      move(dragging, index);
                      setDragging(index);
                    }
                  }}
                  onDrop={(event) => event.preventDefault()}
                  onDragEnd={() => setDragging(undefined)}
                >
                  <div className="page-thumb">
                    {thumb ? (
                      <img
                        src={thumb.url}
                        alt={`${label} preview`}
                        style={{ transform: `rotate(${card.rotate}deg)` }}
                        draggable={false}
                      />
                    ) : (
                      <span className="page-placeholder" aria-hidden="true" />
                    )}
                    {card.removed && <span className="page-flag">Removed</span>}
                  </div>
                  <div className="page-footer">
                    <span className="page-label">
                      {label}
                      {normalizeRotation(card.rotate) !== 0 && (
                        <span className="page-turn"> · {normalizeRotation(card.rotate)}°</span>
                      )}
                    </span>
                    <div className="page-actions">
                      <button type="button" className="icon-button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move ${label} earlier`}>
                        <Icon name="left" size={16} />
                      </button>
                      <button type="button" className="icon-button" onClick={() => move(index, index + 1)} disabled={index === cards.length - 1} aria-label={`Move ${label} later`}>
                        <Icon name="right" size={16} />
                      </button>
                      <button type="button" className="icon-button" onClick={() => update(index, { rotate: card.rotate - 90 })} aria-label={`Turn ${label} left`}>
                        <Icon name="rotateLeft" size={16} />
                      </button>
                      <button type="button" className="icon-button" onClick={() => update(index, { rotate: card.rotate + 90 })} aria-label={`Turn ${label} right`}>
                        <Icon name="rotateRight" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => update(index, { removed: !card.removed })}
                        aria-pressed={card.removed}
                        aria-label={card.removed ? `Keep ${label}` : `Remove ${label}`}
                      >
                        <Icon name={card.removed ? "restore" : "trash"} size={16} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <ActionBar
        label="Save and download"
        busyLabel="Saving…"
        busy={task.busy}
        disabled={kept.length === 0 || !changed}
        error={task.error}
        done={task.done}
        summary={
          kept.length === 0
            ? "Keep at least one page."
            : `${plural(kept.length, "page")} kept${removed ? `, ${removed} removed` : ""}${turned ? `, ${turned} turned` : ""}`
        }
        onRun={() =>
          void task.run(async () => {
            const output = await organize(
              bytes,
              kept.map((card) => ({ source: card.source, rotate: normalizeRotation(card.rotate) })),
            );
            const fileName = `${baseName(name)}-organized.pdf`;
            download(output, fileName);
            return `Saved ${fileName}.`;
          })
        }
      />
    </>
  );
}
