import { useState, useEffect } from "react";
import { renderPage } from "../lib/api";

interface ViewerProps {
  currentPage: number;
  pageCount: number;
}

export default function Viewer({ currentPage, pageCount }: ViewerProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pageCount === 0) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    renderPage(currentPage, 1.5)
      .then((uri) => {
        if (!cancelled) {
          setImageUri(uri);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, pageCount]);

  return (
    <div className="viewer">
      {loading && <div className="viewer-loading">Rendering page...</div>}
      {error && <div className="viewer-error">{error}</div>}
      {imageUri && !loading && (
        <img
          src={imageUri}
          alt={`Page ${currentPage + 1}`}
          className="viewer-page"
          draggable={false}
        />
      )}
    </div>
  );
}
