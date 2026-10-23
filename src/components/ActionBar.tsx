import type { ReactNode } from "react";
import { Icon } from "./Icon";

interface ActionBarProps {
  label: string;
  busyLabel: string;
  busy: boolean;
  disabled?: boolean;
  error?: string;
  done?: string;
  summary?: ReactNode;
  onRun: () => void;
  secondary?: ReactNode;
}

export function ActionBar({ label, busyLabel, busy, disabled, error, done, summary, onRun, secondary }: ActionBarProps) {
  return (
    <div className="action-bar">
      <div className="action-status" aria-live="polite">
        {error ? (
          <span className="status-error" role="alert">
            {error}
          </span>
        ) : done ? (
          <span className="status-done">{done}</span>
        ) : (
          summary && <span className="status-summary">{summary}</span>
        )}
      </div>
      <div className="action-buttons">
        {secondary}
        <button type="button" className="button is-primary" onClick={onRun} disabled={disabled || busy}>
          <Icon name="download" size={18} />
          {busy ? busyLabel : label}
        </button>
      </div>
    </div>
  );
}
