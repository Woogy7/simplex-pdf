import type { DocumentInfo } from "../lib/api";

interface ToolbarProps {
  docInfo: DocumentInfo | null;
  currentPage: number;
  onOpen: () => void;
  onPageChange: (page: number) => void;
}

export default function Toolbar({
  docInfo,
  currentPage,
  onOpen,
  onPageChange,
}: ToolbarProps) {
  const pageCount = docInfo?.pageCount ?? 0;

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <button onClick={onOpen} className="toolbar-btn" title="Open file">
          Open
        </button>
        {docInfo && (
          <span className="toolbar-title">
            {docInfo.title ?? docInfo.filePath.split("/").pop()}
          </span>
        )}
      </div>

      {docInfo && (
        <div className="toolbar-center">
          <button
            className="toolbar-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 0}
            title="Previous page"
          >
            &larr;
          </button>
          <span className="page-indicator">
            <input
              type="number"
              className="page-input"
              value={currentPage + 1}
              min={1}
              max={pageCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onPageChange(val - 1);
              }}
            />
            <span>/ {pageCount}</span>
          </span>
          <button
            className="toolbar-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= pageCount - 1}
            title="Next page"
          >
            &rarr;
          </button>
        </div>
      )}

      <div className="toolbar-right" />
    </header>
  );
}
