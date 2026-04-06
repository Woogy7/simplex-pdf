import { useState, useCallback, useEffect } from "react";
import Toolbar from "./components/Toolbar";
import Viewer from "./components/Viewer";
import Sidebar from "./components/Sidebar";
import {
  pickPdfFile,
  openFile,
  getPageDimensions,
  type DocumentInfo,
  type PageDimensions,
} from "./lib/api";
import "./styles/main.css";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.25;

function App() {
  const [docInfo, setDocInfo] = useState<DocumentInfo | null>(null);
  const [dimensions, setDimensions] = useState<PageDimensions[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    try {
      setError(null);
      const path = await pickPdfFile();
      if (!path) return;

      const info = await openFile(path);
      const dims = await getPageDimensions();
      setDocInfo(info);
      setDimensions(dims);
      setCurrentPage(0);
      setZoom(1.0);
    } catch (err) {
      setError(String(err));
    }
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!docInfo) return;

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (ctrl && e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (ctrl && e.key === "0") {
        e.preventDefault();
        handleZoomReset();
      } else if (ctrl && e.key === "o") {
        e.preventDefault();
        handleOpen();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        handlePageChange(currentPage - 1);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        handlePageChange(currentPage + 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        handlePageChange(0);
      } else if (e.key === "End") {
        e.preventDefault();
        handlePageChange(docInfo.pageCount - 1);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        handlePageChange(currentPage - 10);
      } else if (e.key === "PageDown") {
        e.preventDefault();
        handlePageChange(currentPage + 10);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    docInfo,
    currentPage,
    handleOpen,
    handlePageChange,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  ]);

  return (
    <div className="app-layout">
      <Toolbar
        docInfo={docInfo}
        currentPage={currentPage}
        zoom={zoom}
        sidebarOpen={sidebarOpen}
        onOpen={handleOpen}
        onPageChange={handlePageChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        onToggleSidebar={toggleSidebar}
      />
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
