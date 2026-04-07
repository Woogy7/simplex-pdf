import { useState, useRef, useCallback } from "react";
import type { FormFieldInfo, FieldLibrary, FieldEntry } from "../lib/api";
import { FuzzyDropdown } from "./FuzzyDropdown";

interface FormFillerProps {
  fields: FormFieldInfo[];
  pageDimensions: { width: number; height: number };
  zoom: number;
  annotationMode: string | null;
  onFieldChange: (pageIndex: number, fieldIndex: number, value: string | null, isChecked: boolean | null) => void;
  fieldLibrary: FieldLibrary | null;
}

/** Height threshold in PDF points above which a text field renders as textarea. */
const TEXTAREA_THRESHOLD = 30;

/** Sort fields top-to-bottom, left-to-right for tab order. */
function sortedByPosition(fields: FormFieldInfo[]): FormFieldInfo[] {
  return [...fields].sort((a, b) => {
    const topDiff = b.rect.top - a.rect.top;
    if (Math.abs(topDiff) > 2) return topDiff;
    return a.rect.left - b.rect.left;
  });
}

export function FormFiller({ fields, pageDimensions, zoom, annotationMode, onFieldChange, fieldLibrary }: FormFillerProps) {
  const sorted = sortedByPosition(fields);
  const disablePointerEvents = annotationMode !== null;
  const [focusedFieldKey, setFocusedFieldKey] = useState<string | null>(null);
  const inputRefs = useRef<Map<string, HTMLElement>>(new Map());

  const toCss = (rect: FormFieldInfo["rect"]) => ({
    left: rect.left * zoom,
    top: (pageDimensions.height - rect.top) * zoom,
    width: (rect.right - rect.left) * zoom,
    height: (rect.top - rect.bottom) * zoom,
  });

  const handleFuzzySelect = useCallback((field: FormFieldInfo, entry: FieldEntry) => {
    onFieldChange(field.pageIndex, field.fieldIndex, entry.value, null);
    setFocusedFieldKey(null);
  }, [onFieldChange]);

  const handleFuzzyDismiss = useCallback(() => {
    setFocusedFieldKey(null);
  }, []);

  const setInputRef = useCallback((key: string, el: HTMLElement | null) => {
    if (el) {
      inputRefs.current.set(key, el);
    } else {
      inputRefs.current.delete(key);
    }
  }, []);

  return (
    <>
      {sorted.map((field, sortIndex) => {
        const css = toCss(field.rect);
        const pdfHeight = field.rect.top - field.rect.bottom;
        const fontSize = Math.max(8, Math.min(pdfHeight * 0.7, 14)) * zoom;
        const tabIndex = sortIndex + 1;
        const isEmpty = !field.value && !field.isChecked;
        const requiredClass = field.isRequired && isEmpty ? " form-field-required" : "";

        const baseStyle: React.CSSProperties = {
          position: "absolute",
          left: css.left,
          top: css.top,
          width: css.width,
          height: css.height,
          fontSize,
          pointerEvents: disablePointerEvents ? "none" : "auto",
        };

        const key = `${field.pageIndex}:${field.fieldIndex}`;

        switch (field.fieldType) {
          case "text": {
            const isMultiline = pdfHeight > TEXTAREA_THRESHOLD;
            const isFocused = focusedFieldKey === key;
            const showDropdown = isFocused && (field.value?.length ?? 0) >= 2;

            const inputProps = {
              className: `form-field-overlay form-field-text${requiredClass}`,
              style: baseStyle,
              value: field.value ?? "",
              readOnly: field.isReadOnly,
              disabled: field.isReadOnly,
              tabIndex,
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                onFieldChange(field.pageIndex, field.fieldIndex, e.target.value, null),
              onFocus: () => setFocusedFieldKey(key),
              onBlur: () => {
                // Delay to allow FuzzyDropdown mousedown to fire first
                setTimeout(() => setFocusedFieldKey(prev => prev === key ? null : prev), 150);
              },
            };

            if (isMultiline) {
              return (
                <span key={key}>
                  <textarea
                    ref={(el) => setInputRef(key, el)}
                    {...inputProps}
                  />
                  {showDropdown && (
                    <FuzzyDropdown
                      query={field.value ?? ""}
                      library={fieldLibrary}
                      anchorEl={inputRefs.current.get(key) ?? null}
                      onSelect={(entry) => handleFuzzySelect(field, entry)}
                      onDismiss={handleFuzzyDismiss}
                    />
                  )}
                </span>
              );
            }
            return (
              <span key={key}>
                <input
                  ref={(el) => setInputRef(key, el)}
                  type="text"
                  {...inputProps}
                />
                {showDropdown && (
                  <FuzzyDropdown
                    query={field.value ?? ""}
                    library={fieldLibrary}
                    anchorEl={inputRefs.current.get(key) ?? null}
                    onSelect={(entry) => handleFuzzySelect(field, entry)}
                    onDismiss={handleFuzzyDismiss}
                  />
                )}
              </span>
            );
          }

          case "checkbox":
            return (
              <input
                key={key}
                type="checkbox"
                className={`form-field-overlay form-field-checkbox${requiredClass}`}
                style={{
                  ...baseStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                checked={field.isChecked ?? false}
                disabled={field.isReadOnly}
                tabIndex={tabIndex}
                onChange={(e) => onFieldChange(field.pageIndex, field.fieldIndex, null, e.target.checked)}
              />
            );

          case "radio":
            return (
              <input
                key={key}
                type="radio"
                name={field.name ?? `radio-${field.fieldIndex}`}
                className={`form-field-overlay form-field-radio${requiredClass}`}
                style={{
                  ...baseStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                checked={field.isChecked ?? false}
                disabled={field.isReadOnly}
                tabIndex={tabIndex}
                onChange={(e) => onFieldChange(field.pageIndex, field.fieldIndex, null, e.target.checked)}
              />
            );

          case "combobox":
            return (
              <select
                key={key}
                className={`form-field-overlay form-field-select${requiredClass}`}
                style={baseStyle}
                value={field.value ?? ""}
                disabled={field.isReadOnly}
                tabIndex={tabIndex}
                onChange={(e) => onFieldChange(field.pageIndex, field.fieldIndex, e.target.value, null)}
              >
                <option value=""></option>
                {field.options?.map((opt, oi) => (
                  <option key={oi} value={opt.label ?? ""}>
                    {opt.label ?? ""}
                  </option>
                ))}
              </select>
            );

          case "listbox":
            return (
              <select
                key={key}
                multiple
                className={`form-field-overlay form-field-select${requiredClass}`}
                style={baseStyle}
                value={field.value ? [field.value] : []}
                disabled={field.isReadOnly}
                tabIndex={tabIndex}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (o) => o.value);
                  onFieldChange(field.pageIndex, field.fieldIndex, selected[0] ?? null, null);
                }}
              >
                {field.options?.map((opt, oi) => (
                  <option key={oi} value={opt.label ?? ""}>
                    {opt.label ?? ""}
                  </option>
                ))}
              </select>
            );

          case "pushbutton":
          case "signature":
          case "unknown":
            return null;

          default:
            return null;
        }
      })}
    </>
  );
}
