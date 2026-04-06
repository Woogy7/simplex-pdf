import { useState, useRef, useEffect, useCallback } from "react";
import { searchText, type SearchResults } from "../lib/api";

interface SearchBarProps {
  visible: boolean;
  onClose: () => void;
  onResults: (results: SearchResults | null, currentMatch: number) => void;
  onNavigate: (pageIndex: number) => void;
}

export default function SearchBar({
  visible,
  onClose,
  onResults,
  onNavigate,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [currentMatch, setCurrentMatch] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when search bar becomes visible
  useEffect(() => {
    if (visible) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [visible]);

  const doSearch = useCallback(
    async (q: string, cs: boolean, ww: boolean) => {
      if (!q.trim()) {
        setResults(null);
        setCurrentMatch(0);
        onResults(null, 0);
        return;
      }
      try {
        const res = await searchText(q, cs, ww);
        setResults(res);
        setCurrentMatch(0);
        onResults(res, 0);
        if (res.matches.length > 0) {
          onNavigate(res.matches[0].pageIndex);
        }
      } catch {
        setResults(null);
        setCurrentMatch(0);
        onResults(null, 0);
      }
    },
    [onResults, onNavigate],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query, caseSensitive, wholeWord);
  };

  const navigateMatch = useCallback(
    (delta: number) => {
      if (!results || results.matches.length === 0) return;
      const next =
        (currentMatch + delta + results.matches.length) %
        results.matches.length;
      setCurrentMatch(next);
      onResults(results, next);
      onNavigate(results.matches[next].pageIndex);
    },
    [results, currentMatch, onResults, onNavigate],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      navigateMatch(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results) {
        navigateMatch(1);
      } else {
        doSearch(query, caseSensitive, wholeWord);
      }
    }
  };

  if (!visible) return null;

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-form">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search in document..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className={`search-option ${caseSensitive ? "active" : ""}`}
          onClick={() => {
            const next = !caseSensitive;
            setCaseSensitive(next);
            if (query) doSearch(query, next, wholeWord);
          }}
          title="Case sensitive"
        >
          Aa
        </button>
        <button
          type="button"
          className={`search-option ${wholeWord ? "active" : ""}`}
          onClick={() => {
            const next = !wholeWord;
            setWholeWord(next);
            if (query) doSearch(query, caseSensitive, next);
          }}
          title="Whole word"
        >
          W
        </button>
      </form>
      <div className="search-nav">
        {results && (
          <span className="search-count">
            {results.totalMatches > 0
              ? `${currentMatch + 1} / ${results.totalMatches}`
              : "No results"}
          </span>
        )}
        <button
          className="toolbar-btn"
          onClick={() => navigateMatch(-1)}
          disabled={!results || results.totalMatches === 0}
          title="Previous match (Shift+Enter)"
        >
          &#8593;
        </button>
        <button
          className="toolbar-btn"
          onClick={() => navigateMatch(1)}
          disabled={!results || results.totalMatches === 0}
          title="Next match (Enter)"
        >
          &#8595;
        </button>
        <button className="toolbar-btn" onClick={onClose} title="Close (Esc)">
          &#10005;
        </button>
      </div>
    </div>
  );
}
