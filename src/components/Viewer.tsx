import { useState, useEffect, useRef, useCallback } from "react";
import {
  renderPage,
  addMarkup,
  addNote,
  type PageDimensions,
  type SearchResults,
  type AnnotationColor,
} from "../lib/api";
import type { AnnotationMode } from "./Toolbar";

interface ViewerProps {
  currentPage: number;
  pageCount: number;
  dimensions: PageDimensions[];
  zoom: number;
  searchResults: SearchResults | null;
  currentMatchIndex: number;
  annotationMode: AnnotationMode;
  annotationColor: string;
  onPageChange: (page: number) => void;
}

const PAGE_GAP = 16;
const BUFFER_PAGES = 1;

/** Parses a hex color string to an AnnotationColor. */
function hexToColor(hex: string): AnnotationColor {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
    a: 128,
  };
}

interface DragState {
  pageIndex: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export default function Viewer({
  currentPage,
  pageCount,
  dimensions,
  zoom,
  searchResults,
  currentMatchIndex,
  annotationMode,
  annotationColor,
  onPageChange,
}: ViewerProps) {
  const [renderedPages, setRenderedPages] = useState<Map<number, string>>(
    new Map(),
  );
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([0]));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [renderVersion, setRenderVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollingToRef = useRef(false);

  // Reset state when document changes
  useEffect(() => {
    setRenderedPages(new Map());
    setVisiblePages(new Set([0]));
  }, [pageCount]);

  // Set up intersection observer
  useEffect(() => {
    if (dimensions.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            const index = Number(entry.target.getAttribute("data-page-index"));
            if (entry.isIntersecting) {
              next.add(index);
            } else {
              next.delete(index);
            }
          }
          return next;
        });
      },
      {
        root: containerRef.current,
        rootMargin: "200px 0px",
        threshold: 0.01,
      },
    );

    for (const [, el] of pageRefs.current) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [dimensions]);

  // Update current page from scroll
  useEffect(() => {
    if (visiblePages.size === 0 || scrollingToRef.current) return;
    const sorted = Array.from(visiblePages).sort((a, b) => a - b);
    const topVisible = sorted[0];
    if (topVisible !== undefined && topVisible !== currentPage) {
      onPageChange(topVisible);
    }
  }, [visiblePages, currentPage, onPageChange]);

  // Scroll to page on external navigation
  useEffect(() => {
    const el = pageRefs.current.get(currentPage);
    if (!el || !containerRef.current) return;

    const container = containerRef.current;
    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const visible =
      rect.top >= containerRect.top - 50 &&
      rect.top <= containerRect.bottom - 100;

    if (!visible) {
      scrollingToRef.current = true;
      el.scrollIntoView({ behavior: "auto", block: "start" });
      setTimeout(() => {
        scrollingToRef.current = false;
      }, 100);
    }
  }, [currentPage]);

  // Render visible pages + buffer
  useEffect(() => {
    if (dimensions.length === 0) return;

    const toRender = new Set<number>();
    for (const p of visiblePages) {
      for (
        let i = Math.max(0, p - BUFFER_PAGES);
        i <= Math.min(pageCount - 1, p + BUFFER_PAGES);
        i++
      ) {
        toRender.add(i);
      }
    }

    const scale = zoom * 1.5;
    const version = renderVersion;
    for (const pageIndex of toRender) {
      if (renderedPages.has(pageIndex)) {
        const cached = renderedPages.get(pageIndex)!;
        if (cached.startsWith(`v${version}:scale:${scale}:`)) continue;
      }

      renderPage(pageIndex, scale)
        .then((uri) => {
          setRenderedPages((prev) => {
            const next = new Map(prev);
            next.set(pageIndex, `v${version}:scale:${scale}:${uri}`);
            return next;
          });
        })
        .catch(console.error);
    }
  }, [visiblePages, dimensions, zoom, pageCount, renderedPages, renderVersion]);

  const setPageRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) {
        pageRefs.current.set(index, el);
      } else {
        pageRefs.current.delete(index);
      }
    },
    [],
  );

  const getImageUri = (pageIndex: number): string | null => {
    const entry = renderedPages.get(pageIndex);
    if (!entry) return null;
    // Strip all prefixes: v{N}:scale:{S}:{uri}
    const dataIdx = entry.indexOf("data:");
    return dataIdx >= 0 ? entry.substring(dataIdx) : null;
  };

  // Convert mouse position to PDF coordinates
  const mouseToPdf = (
    e: React.MouseEvent,
    pageIndex: number,
    pageEl: HTMLDivElement,
  ) => {
    const rect = pageEl.getBoundingClientRect();
    const dim = dimensions[pageIndex];
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    // Convert from display coords to PDF points
    const pdfX = (cssX / zoom) * 1; // dim.width is in points, display = dim.width * zoom
    const pdfY = dim.height - cssY / zoom; // PDF y is bottom-up
    return { x: pdfX, y: pdfY };
  };

  const handleMouseDown = (
    e: React.MouseEvent,
    pageIndex: number,
    pageEl: HTMLDivElement,
  ) => {
    if (!annotationMode) return;
    const pos = mouseToPdf(e, pageIndex, pageEl);
    setDrag({
      pageIndex,
      startX: pos.x,
      startY: pos.y,
      currentX: pos.x,
      currentY: pos.y,
    });
  };

  const handleMouseMove = (
    e: React.MouseEvent,
    pageIndex: number,
    pageEl: HTMLDivElement,
  ) => {
    if (!drag || drag.pageIndex !== pageIndex) return;
    const pos = mouseToPdf(e, pageIndex, pageEl);
    setDrag((d) => (d ? { ...d, currentX: pos.x, currentY: pos.y } : null));
  };

  const handleMouseUp = async () => {
    if (!drag || !annotationMode) {
      setDrag(null);
      return;
    }

    const color = hexToColor(annotationColor);
    const rect = {
      left: Math.min(drag.startX, drag.currentX),
      right: Math.max(drag.startX, drag.currentX),
      bottom: Math.min(drag.startY, drag.currentY),
      top: Math.max(drag.startY, drag.currentY),
    };

    // Require minimum size for drag annotations
    const width = rect.right - rect.left;
    const height = rect.top - rect.bottom;

    try {
      if (annotationMode === "note") {
        const content = window.prompt("Enter note text:");
        if (content) {
          await addNote(
            drag.pageIndex,
            { left: drag.startX, top: drag.startY + 24, right: drag.startX + 24, bottom: drag.startY },
            content,
            { ...color, a: 255 },
          );
          // Force re-render of affected page
          setRenderedPages((prev) => {
            const next = new Map(prev);
            next.delete(drag.pageIndex);
            return next;
          });
          setRenderVersion((v) => v + 1);
        }
      } else if (width > 2 && height > 2) {
        await addMarkup(drag.pageIndex, annotationMode, rect, color);
        setRenderedPages((prev) => {
          const next = new Map(prev);
          next.delete(drag.pageIndex);
          return next;
        });
        setRenderVersion((v) => v + 1);
      }
    } catch (err) {
      console.error("Annotation error:", err);
    }

    setDrag(null);
  };

  // Render drag preview overlay
  const getDragOverlay = (pageIndex: number, pageDim: PageDimensions) => {
    if (!drag || drag.pageIndex !== pageIndex) return null;

    const left = Math.min(drag.startX, drag.currentX) * zoom;
    const right = Math.max(drag.startX, drag.currentX) * zoom;
    const topPdf = Math.max(drag.startY, drag.currentY);
    const bottomPdf = Math.min(drag.startY, drag.currentY);
    const top = (pageDim.height - topPdf) * zoom;
    const bottom = (pageDim.height - bottomPdf) * zoom;

    return (
      <div
        className="annotation-preview"
        style={{
          left,
          top,
          width: right - left,
          height: bottom - top,
        }}
      />
    );
  };

  // Search match overlays
  const getMatchOverlays = (pageIndex: number, pageDim: PageDimensions) => {
    if (!searchResults) return null;

    return searchResults.matches.map((match, gi) => {
      if (match.pageIndex !== pageIndex) return null;
      const isCurrent = gi === currentMatchIndex;

      return match.rects.map((rect, ri) => {
        const left = rect.left * zoom;
        const top = (pageDim.height - rect.top) * zoom;
        const width = (rect.right - rect.left) * zoom;
        const height = (rect.top - rect.bottom) * zoom;

        return (
          <div
            key={`${gi}-${ri}`}
            className={`search-highlight ${isCurrent ? "current" : ""}`}
            style={{ left, top, width, height }}
          />
        );
      });
    });
  };

  if (dimensions.length === 0) {
    return (
      <div className="viewer">
        <div className="viewer-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className={`viewer ${annotationMode ? "annotating" : ""}`}
      ref={containerRef}
    >
      <div className="viewer-pages">
        {dimensions.map((dim, index) => {
          const imageUri = getImageUri(index);
          const displayWidth = dim.width * zoom;
          const displayHeight = dim.height * zoom;

          return (
            <div
              key={index}
              ref={setPageRef(index)}
              data-page-index={index}
              className={`viewer-page-wrapper ${
                index === currentPage ? "current" : ""
              }`}
              style={{
                width: displayWidth,
                height: displayHeight,
                marginBottom: index < pageCount - 1 ? PAGE_GAP : 0,
              }}
              onMouseDown={(e) => {
                const el = pageRefs.current.get(index);
                if (el) handleMouseDown(e, index, el);
              }}
              onMouseMove={(e) => {
                const el = pageRefs.current.get(index);
                if (el) handleMouseMove(e, index, el);
              }}
              onMouseUp={handleMouseUp}
            >
              {imageUri ? (
                <img
                  src={imageUri}
                  alt={`Page ${index + 1}`}
                  className="viewer-page"
                  draggable={false}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <div className="viewer-page-placeholder">
                  <span>{index + 1}</span>
                </div>
              )}
              {searchResults && getMatchOverlays(index, dim)}
              {getDragOverlay(index, dim)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
