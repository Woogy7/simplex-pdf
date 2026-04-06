import { useState, useEffect, useRef } from "react";
import { renderPage, type PageDimensions } from "../lib/api";

interface SidebarProps {
  pageCount: number;
  dimensions: PageDimensions[];
  currentPage: number;
  onPageSelect: (page: number) => void;
}

const THUMBNAIL_WIDTH = 120;

export default function Sidebar({
  pageCount,
  dimensions,
  currentPage,
  onPageSelect,
}: SidebarProps) {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const currentRef = useRef<HTMLButtonElement>(null);

  // Render thumbnails at low resolution
  useEffect(() => {
    if (pageCount === 0 || dimensions.length === 0) return;

    for (let i = 0; i < pageCount; i++) {
      if (thumbnails.has(i)) continue;

      // Low DPI for thumbnails
      renderPage(i, 0.3)
        .then((uri) => {
          setThumbnails((prev) => {
            const next = new Map(prev);
            next.set(i, uri);
            return next;
          });
        })
        .catch(console.error);
    }
  }, [pageCount, dimensions, thumbnails]);

  // Scroll current thumbnail into view
  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentPage]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">Pages</div>
      <div className="sidebar-pages">
        {dimensions.map((dim, index) => {
          const aspectRatio = dim.height / dim.width;
          const thumbHeight = THUMBNAIL_WIDTH * aspectRatio;
          const uri = thumbnails.get(index);
          const isCurrent = index === currentPage;

          return (
            <button
              key={index}
              ref={isCurrent ? currentRef : null}
              className={`sidebar-thumb ${isCurrent ? "active" : ""}`}
              onClick={() => onPageSelect(index)}
              title={`Page ${index + 1}`}
            >
              <div
                className="sidebar-thumb-image"
                style={{ width: THUMBNAIL_WIDTH, height: thumbHeight }}
              >
                {uri ? (
                  <img src={uri} alt={`Page ${index + 1}`} draggable={false} />
                ) : (
                  <div className="sidebar-thumb-placeholder">{index + 1}</div>
                )}
              </div>
              <span className="sidebar-thumb-label">{index + 1}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
