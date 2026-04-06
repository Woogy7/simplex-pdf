import type { DocumentInfo } from "../lib/api";

export type AnnotationMode =
  | null
  | "highlight"
  | "underline"
  | "strikeout"
  | "note";

const PRESET_COLORS = [
  { name: "Yellow", value: "#FFD500" },
  { name: "Green", value: "#4CAF50" },
  { name: "Blue", value: "#2196F3" },
  { name: "Red", value: "#F44336" },
  { name: "Purple", value: "#9C27B0" },
];

interface ToolbarProps {
  docInfo: DocumentInfo | null;
  currentPage: number;
  zoom: number;
  sidebarOpen: boolean;
  annotationMode: AnnotationMode;
  annotationColor: string;
  onOpen: () => void;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onToggleSidebar: () => void;
  onSearch: () => void;
  onAnnotationMode: (mode: AnnotationMode) => void;
  onAnnotationColor: (color: string) => void;
  onSave: () => void;
}

export default function Toolbar({
  docInfo,
  currentPage,
  zoom,
  sidebarOpen,
  annotationMode,
  annotationColor,
  onOpen,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onToggleSidebar,
  onSearch,
  onAnnotationMode,
  onAnnotationColor,
  onSave,
}: ToolbarProps) {
  const pageCount = docInfo?.pageCount ?? 0;

  const modeBtn = (mode: AnnotationMode, label: string, title: string) => (
    <button
      className={`toolbar-btn ${annotationMode === mode ? "active" : ""}`}
      onClick={() => onAnnotationMode(annotationMode === mode ? null : mode)}
      title={title}
    >
      {label}
    </button>
  );

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <button
          onClick={onOpen}
          className="toolbar-btn"
          title="Open file (Ctrl+O)"
        >
          Open
        </button>
        {docInfo && (
          <>
            <button
              onClick={onSave}
              className="toolbar-btn"
              title="Save (Ctrl+S)"
            >
              Save
            </button>
            <span className="toolbar-title">
              {docInfo.title ?? docInfo.filePath.split("/").pop()}
            </span>
          </>
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

          <span className="toolbar-divider" />

          {modeBtn("highlight", "H", "Highlight")}
          {modeBtn("underline", "U", "Underline")}
          {modeBtn("strikeout", "S", "Strikeout")}
          {modeBtn("note", "N", "Sticky note")}

          {annotationMode && (
            <span className="color-picker">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  className={`color-dot ${annotationColor === c.value ? "selected" : ""}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => onAnnotationColor(c.value)}
                  title={c.name}
                />
              ))}
            </span>
          )}
        </div>
      )}

      <div className="toolbar-right">
        {docInfo && (
          <>
            <button
              className="toolbar-btn"
              onClick={onSearch}
              title="Search (Ctrl+F)"
            >
              Search
            </button>
            <button
              className={`toolbar-btn ${sidebarOpen ? "active" : ""}`}
              onClick={onToggleSidebar}
              title="Toggle sidebar"
            >
              &#9776;
            </button>
          </>
        )}
      </div>
    </header>
  );
}
