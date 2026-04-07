import { useState, useCallback, useEffect } from "react";
import Toolbar, { type AnnotationMode } from "./components/Toolbar";
import Viewer from "./components/Viewer";
import Sidebar from "./components/Sidebar";
import SearchBar from "./components/SearchBar";
import {
  pickPdfFile,
  openFile,
  getPageDimensions,
  getAnnotations,
  saveWithAnnotations,
  type DocumentInfo,
  type PageDimensions,
  type SearchResults,
} from "./lib/api";
import type { Annotation } from "./lib/annotations";
import { createAnnotation, createInkAnnotation } from "./lib/annotations";
import "./styles/main.css";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.25;

/** Convert a hex color to the backend's RGBA format. */
function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
    a: alpha,
  };
}

function App() {
  const [docInfo, setDocInfo] = useState<DocumentInfo | null>(null);
  const [dimensions, setDimensions] = useState<PageDimensions[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>(null);
  const [annotationColor, setAnnotationColor] = useState("#FFD500");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const handleOpen = useCallback(async () => {
    try {
      setError(null);
      const path = await pickPdfFile();
      if (!path) return;
      const info = await openFile(path);
      const dims = await getPageDimensions();
      // Load existing annotations from the PDF and convert to overlay format.
      // Non-fatal: if reading fails, just open without annotations.
      let loadedAnns: Annotation[] = [];
      try {
        const existing = await getAnnotations();
        loadedAnns = existing.map((ea) => {
          if (ea.annotationType === "ink" && ea.inkStroke) {
            return createInkAnnotation(
              ea.pageIndex,
              ea.inkStroke.points,
              ea.color,
              ea.inkStroke.strokeWidth,
            );
          }
          return createAnnotation(
            ea.pageIndex,
            ea.annotationType as Annotation["type"],
            ea.rect,
            ea.color,
            ea.content ?? undefined,
          );
        });
      } catch (err) {
        console.warn("Could not load existing annotations:", err);
      }
      setDocInfo(info);
      setDimensions(dims);
      setCurrentPage(0);
      setZoom(1.0);
      setSearchResults(null);
      setAnnotationMode(null);
      setAnnotations(loadedAnns);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setError(null);
      // Convert frontend annotations to backend format and save
      const annData = annotations.map((a) => ({
        pageIndex: a.pageIndex,
        annotationType: a.type,
        rect: a.rect,
        color: hexToRgba(
          a.color,
          a.type === "note" || a.type === "ink" ? 255 : 128,
        ),
        content: a.content,
        inkStroke: a.inkStroke,
      }));
      await saveWithAnnotations(annData);
      // Keep annotations visible — they're now in the PDF AND shown as overlays.
    } catch (err) {
      setError(String(err));
    }
  }, [annotations]);

  const handleAddAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => [...prev, annotation]);
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      if (!docInfo) return;
      setCurrentPage(Math.max(0, Math.min(page, docInfo.pageCount - 1)));
    },
    [docInfo],
  );

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1.0);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((s) => !s);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      if (t === "system") return "dark";
      if (t === "dark") return "light";
      return "system";
    });
  }, []);

  const handleSearchResults = useCallback(
    (results: SearchResults | null, matchIndex: number) => {
      setSearchResults(results);
      setCurrentMatchIndex(matchIndex);
    },
    [],
  );

  const handleSearchClose = useCallback(() => {
    setSearchOpen(false);
    setSearchResults(null);
    setCurrentMatchIndex(0);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && (e.key === "f" || e.key === "F") && docInfo) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (ctrl && e.key === "s" && docInfo) {
        e.preventDefault();
        handleSave();
        return;
      }
      if (ctrl && e.key === "o") { e.preventDefault(); handleOpen(); return; }
      if (e.key === "Escape") {
        setAnnotationMode(null);
        return;
      }

      if (!docInfo) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (ctrl && e.key === "=") { e.preventDefault(); handleZoomIn(); }
      else if (ctrl && e.key === "-") { e.preventDefault(); handleZoomOut(); }
      else if (ctrl && e.key === "0") { e.preventDefault(); handleZoomReset(); }
      else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) { return; }
      else if (e.key === "Home") { e.preventDefault(); handlePageChange(0); }
      else if (e.key === "End") { e.preventDefault(); handlePageChange(docInfo.pageCount - 1); }
      else if (e.key === "PageUp") { e.preventDefault(); handlePageChange(currentPage - 1); }
      else if (e.key === "PageDown") { e.preventDefault(); handlePageChange(currentPage + 1); }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [docInfo, currentPage, handleOpen, handleSave, handlePageChange, handleZoomIn, handleZoomOut, handleZoomReset]);

  return (
    <div className="app-layout">
      <Toolbar
        docInfo={docInfo}
        currentPage={currentPage}
        zoom={zoom}
        sidebarOpen={sidebarOpen}
        annotationMode={annotationMode}
        annotationColor={annotationColor}
        strokeWidth={strokeWidth}
        onOpen={handleOpen}
        onPageChange={handlePageChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onToggleSidebar={toggleSidebar}
        onSearch={() => setSearchOpen(true)}
        onAnnotationMode={setAnnotationMode}
        onAnnotationColor={setAnnotationColor}
        onStrokeWidth={setStrokeWidth}
        onSave={handleSave}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      {searchOpen && (
        <SearchBar
          visible={searchOpen}
          onClose={handleSearchClose}
          onResults={handleSearchResults}
          onNavigate={handlePageChange}
        />
      )}
      <div className="main-content">
        {error && <div className="error-banner">{error}</div>}
        {docInfo ? (
          <>
            {sidebarOpen && (
              <Sidebar
                pageCount={docInfo.pageCount}
                dimensions={dimensions}
                currentPage={currentPage}
                onPageSelect={handlePageChange}
              />
            )}
            <Viewer
              currentPage={currentPage}
              pageCount={docInfo.pageCount}
              dimensions={dimensions}
              zoom={zoom}
              searchResults={searchResults}
              currentMatchIndex={currentMatchIndex}
              annotationMode={annotationMode}
              annotationColor={annotationColor}
              strokeWidth={strokeWidth}
              annotations={annotations}
              onAddAnnotation={handleAddAnnotation}
              onPageChange={handlePageChange}
            />
          </>
        ) : (
          <div className="empty-state">
            <h1>Simplex PDF</h1>
            <p>Open a PDF file to get started.</p>
            <button onClick={handleOpen} className="btn-primary">
              Open File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
