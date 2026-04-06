import { useState, useCallback } from "react";
import Toolbar from "./components/Toolbar";
import Viewer from "./components/Viewer";
import { pickPdfFile, openFile, type DocumentInfo } from "./lib/api";
import "./styles/main.css";

function App() {
  const [docInfo, setDocInfo] = useState<DocumentInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(async () => {
    try {
      setError(null);
      const path = await pickPdfFile();
      if (!path) return;

      const info = await openFile(path);
      setDocInfo(info);
      setCurrentPage(0);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  const handlePageChange = useCallback(
    (page: number) => {
      if (!docInfo) return;
      const clamped = Math.max(0, Math.min(page, docInfo.pageCount - 1));
      setCurrentPage(clamped);
    },
    [docInfo],
  );

  return (
    <div className="app-layout">
      <Toolbar
        docInfo={docInfo}
        currentPage={currentPage}
        onOpen={handleOpen}
        onPageChange={handlePageChange}
      />
      <main className="main-content">
        {error && <div className="error-banner">{error}</div>}
        {docInfo ? (
          <Viewer currentPage={currentPage} pageCount={docInfo.pageCount} />
        ) : (
          <div className="empty-state">
            <h1>Simplex PDF</h1>
            <p>Open a PDF file to get started.</p>
            <button onClick={handleOpen} className="btn-primary">
              Open File
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
