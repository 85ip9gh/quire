import type { usePdfList } from "../hooks/usePdfList";
import { DropZone } from "./DropZone";
import { FileList } from "./FileList";
import { Unlock, statusDetail } from "./Unlock";

type PdfList = ReturnType<typeof usePdfList>;

interface PdfPickerProps {
  list: PdfList;
  multiple?: boolean;
  title?: string;
  hint?: string;
}

export function PdfPicker({ list, multiple = false, title, hint }: PdfPickerProps) {
  const empty = list.items.length === 0;
  const entries = list.items.map((item) => ({ ...item, detail: statusDetail(item) }));

  return (
    <div className="picker">
      <FileList
        items={entries}
        label={multiple ? "Files in order" : "Selected file"}
        onMove={multiple ? list.move : undefined}
        onRemove={list.remove}
      >
        {(item) => <Unlock item={item} onUnlock={list.unlock} />}
      </FileList>
      <DropZone
        accept="application/pdf,.pdf"
        multiple={multiple}
        compact={!empty}
        title={title ?? (empty ? (multiple ? "Choose PDFs" : "Choose a PDF") : multiple ? "Add more PDFs" : "Choose a different PDF")}
        hint={hint ?? (empty ? "or drop them here. They stay on this device." : "or drop them here")}
        onFiles={(files) => void list.add(files)}
      />
      {list.notice && <p className="notice">{list.notice}</p>}
    </div>
  );
}
