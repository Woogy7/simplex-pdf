import type { DocumentInfo } from "../lib/api";

interface ToolbarProps {
  docInfo: DocumentInfo | null;
  currentPage: number;
  zoom: number;
  sidebarOpen: boolean;
  onOpen: () => void;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleSidebar: () => void;
}

export default function Toolbar({
  docInfo,
  currentPage,
  zoom,
  sidebarOpen,
  onOpen,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleSidebar,
}: ToolbarProps) {
  const pageCount = docInfo?.pageCount ?? 0;

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <button onClick={onOpen} className="toolbar-btn" title="Open file (Ctrl+O)">
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
            &#8592;
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
            &#8594;
          </button>

          <span className="toolbar-divider" />

          <button
            className="toolbar-btn"
            onClick={onZoomOut}
            disabled={zoom <= 0.25}
            title="Zoom out (Ctrl+-)"
          >
            &#8722;
          </button>
          <button
            className="toolbar-btn zoom-label"
            onClick={onZoomReset}
            title="Reset zoom (Ctrl+0)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            className="toolbar-btn"
            onClick={onZoomIn}
            disabled={zoom >= 4.0}
            title="Zoom in (Ctrl+=)"
          >
            +
          </button>
        </div>
      )}

      <div className="toolbar-right">
        {docInfo && (
          <button
            className={`toolbar-btn ${sidebarOpen ? "active" : ""}`}
            onClick={onToggleSidebar}
            title="Toggle sidebar"
          >
            &#9776;
          </button>
        )}
      </div>
    </header>
  );
}
