import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { fuzzySearch, type FuzzyMatch } from "../lib/fuzzy";
import type { FieldLibrary, FieldEntry } from "../lib/api";

interface FuzzyDropdownProps {
  query: string;
  library: FieldLibrary | null;
  anchorEl: HTMLElement | null;
  onSelect: (entry: FieldEntry) => void;
  onDismiss: () => void;
}

export function FuzzyDropdown({ query, library, anchorEl, onSelect, onDismiss }: FuzzyDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const matches: FuzzyMatch[] = library ? fuzzySearch(query, library) : [];

  // Reset selection when query changes
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Stable callback refs for keyboard handler
  const handleSelect = useCallback((entry: FieldEntry) => {
    onSelect(entry);
  }, [onSelect]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // Keyboard navigation (capture phase to intercept before input's own keydown)
  useEffect(() => {
    if (!matches.length) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, matches.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        // Read selectedIndex synchronously via closure over latest matches
        setSelectedIndex(currentIdx => {
          const match = matches[currentIdx];
          if (match) {
            e.preventDefault();
            handleSelect(match.entry);
          }
          return currentIdx;
        });
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [matches, handleSelect, handleDismiss]);

  if (!matches.length || !anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();
  const style: React.CSSProperties = {
    position: "fixed",
    left: rect.left,
    top: rect.bottom + 2,
    width: Math.max(rect.width, 250),
    zIndex: 9999,
  };

  return createPortal(
    <div className="fuzzy-dropdown" style={style}>
      {matches.map((match, i) => (
        <div
          key={match.entry.id}
          className={`fuzzy-dropdown-item ${i === selectedIndex ? "selected" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(match.entry); }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="fuzzy-dropdown-label">{match.entry.label}</span>
          <span className="fuzzy-dropdown-preview">
            {match.entry.value.length > 40 ? match.entry.value.slice(0, 40) + "..." : match.entry.value}
          </span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
