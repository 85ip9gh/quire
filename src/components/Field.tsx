import { type ReactNode, useId } from "react";

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const describedBy = hint || error ? hintId : undefined;
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children(id, describedBy)}
      {(error || hint) && (
        <span id={hintId} className={error ? "field-error" : "field-hint"}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
}

interface ChoiceProps<T extends string> {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}

export function Choice<T extends string>({ legend, name, value, options, onChange }: ChoiceProps<T>) {
  return (
    <fieldset className="choice">
      <legend>{legend}</legend>
      <div className="choice-options">
        {options.map((option) => (
          <label key={option.value} className={`choice-option${option.value === value ? " is-checked" : ""}`}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span className="choice-label">{option.label}</span>
            {option.hint && <span className="choice-hint">{option.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
