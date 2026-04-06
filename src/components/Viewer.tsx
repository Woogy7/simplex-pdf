import { useState, useEffect, useRef, useCallback } from "react";
import { renderPage, type PageDimensions, type SearchResults } from "../lib/api";
import type { Annotation } from "../lib/annotations";
import { createAnnotation } from "../lib/annotations";
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
  annotations: Annotation[];
  onAddAnnotation: (annotation: Annotation) => void;
  onPageChange: (page: number) => void;
}

const PAGE_GAP = 16;
const BUFFER_PAGES = 1;

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
  annotations,
  onAddAnnotation,
  onPageChange,
}: ViewerProps) {
  const [renderedPages, setRenderedPages] = useState<Map<number, string>>(
    new Map(),
  );
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([0]));
  const [drag, setDrag] = useState<DragState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollingToRef = useRef(false);
  const renderingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setRenderedPages(new Map());
    setVisiblePages(new Set([0]));
    renderingRef.current.clear();
  }, [pageCount]);

  useEffect(() => {
    renderingRef.current.clear();
  }, [zoom]);

  // Intersection observer
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
      { root: containerRef.current, rootMargin: "200px 0px", threshold: 0.01 },
    );
    for (const [, el] of pageRefs.current) observer.observe(el);
    return () => observer.disconnect();
  }, [dimensions]);

  // Track current page from scroll
  useEffect(() => {
    if (visiblePages.size === 0 || scrollingToRef.current) return;
    const sorted = Array.from(visiblePages).sort((a, b) => a - b);
    const topVisible = sorted[0];
    if (topVisible !== undefined && topVisible !== currentPage) {
      onPageChange(topVisible);
    }
  }, [visiblePages]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setTimeout(() => { scrollingToRef.current = false; }, 300);
    }
  }, [currentPage]);

  // Scroll to search match
  useEffect(() => {
    if (!searchResults || searchResults.matches.length === 0) return;
    const match = searchResults.matches[currentMatchIndex];
    if (!match) return;
    const pageEl = pageRefs.current.get(match.pageIndex);
    const container = containerRef.current;
    if (!pageEl || !container) return;
    setTimeout(() => {
      const pageRect = pageEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const dim = dimensions[match.pageIndex];
      const firstRect = match.rects[0];
      if (!dim || !firstRect) return;
      const matchAbsTop = pageRect.top + (dim.height - firstRect.top) * zoom;
      const matchAbsLeft = pageRect.left + firstRect.left * zoom;
      const isVisible =
        matchAbsTop >= containerRect.top &&
        matchAbsTop <= containerRect.bottom - 40 &&
        matchAbsLeft >= containerRect.left &&
        matchAbsLeft <= containerRect.right - 40;
      if (!isVisible) {
        scrollingToRef.current = true;
        container.scrollTo({
          top: container.scrollTop + (matchAbsTop - containerRect.top) - containerRect.height / 3,
          left: container.scrollLeft + (matchAbsLeft - containerRect.left) - containerRect.width / 3,
          behavior: "auto",
        });
        setTimeout(() => { scrollingToRef.current = false; }, 300);
      }
    }, 50);
  }, [searchResults, currentMatchIndex, zoom, dimensions]);

  // Render visible pages
  useEffect(() => {
    if (dimensions.length === 0) return;
    const toRender = new Set<number>();
    for (const p of visiblePages) {
      for (let i = Math.max(0, p - BUFFER_PAGES); i <= Math.min(pageCount - 1, p + BUFFER_PAGES); i++) {
        toRender.add(i);
      }
    }
    const scale = zoom;
    for (const pageIndex of toRender) {
      const cacheKey = `${scale}:${pageIndex}`;
      if (renderingRef.current.has(cacheKey)) continue;
      renderingRef.current.add(cacheKey);
      renderPage(pageIndex, scale)
        .then((uri) => {
          setRenderedPages((prev) => {
            const next = new Map(prev);
            next.set(pageIndex, `scale:${scale}:${uri}`);
            return next;
          });
        })
        .catch(console.error);
    }
  }, [visiblePages, dimensions, zoom, pageCount]);

  const setPageRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) pageRefs.current.set(index, el);
      else pageRefs.current.delete(index);
    },
    [],
  );

  const getImageUri = (pageIndex: number): string | null => {
    const entry = renderedPages.get(pageIndex);
    if (!entry) return null;
    const dataIdx = entry.indexOf("data:");
    return dataIdx >= 0 ? entry.substring(dataIdx) : null;
  };

  // --- Mouse interaction for annotations ---

  const mouseToPdf = (e: React.MouseEvent, pageIndex: number, pageEl: HTMLDivElement) => {
    const rect = pageEl.getBoundingClientRect();
    const dim = dimensions[pageIndex];
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    return { x: cssX / zoom, y: dim.height - cssY / zoom };
  };

  const handleMouseDown = (e: React.MouseEvent, pageIndex: number, pageEl: HTMLDivElement) => {
    if (!annotationMode) return;
    const pos = mouseToPdf(e, pageIndex, pageEl);
    setDrag({ pageIndex, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y });
  };

  const handleMouseMove = (e: React.MouseEvent, pageIndex: number, pageEl: HTMLDivElement) => {
    if (!drag || drag.pageIndex !== pageIndex) return;
    const pos = mouseToPdf(e, pageIndex, pageEl);
    setDrag((d) => (d ? { ...d, currentX: pos.x, currentY: pos.y } : null));
  };

  const handleMouseUp = () => {
    if (!drag || !annotationMode) {
      setDrag(null);
      return;
    }

    const rect = {
      left: Math.min(drag.startX, drag.currentX),
      right: Math.max(drag.startX, drag.currentX),
      bottom: Math.min(drag.startY, drag.currentY),
      top: Math.max(drag.startY, drag.currentY),
    };
    const width = rect.right - rect.left;
    const height = rect.top - rect.bottom;

    if (annotationMode === "note") {
      const content = window.prompt("Enter note text:");
      if (content) {
        onAddAnnotation(
          createAnnotation(
            drag.pageIndex,
            "note",
            { left: drag.startX, top: drag.startY + 24, right: drag.startX + 24, bottom: drag.startY },
            annotationColor,
            content,
          ),
        );
      }
    } else if (width > 2 && height > 2) {
      onAddAnnotation(
        createAnnotation(drag.pageIndex, annotationMode, rect, annotationColor),
      );
    }

    setDrag(null);
  };

  // --- Overlays ---

  /** Convert PDF rect to CSS positioning on a page element. */
  const pdfRectToCss = (
    pdfRect: { left: number; top: number; right: number; bottom: number },
    pageDim: PageDimensions,
  ) => ({
    left: pdfRect.left * zoom,
    top: (pageDim.height - pdfRect.top) * zoom,
    width: (pdfRect.right - pdfRect.left) * zoom,
    height: (pdfRect.top - pdfRect.bottom) * zoom,
  });

  const getAnnotationOverlays = (pageIndex: number, pageDim: PageDimensions) => {
    const pageAnns = annotations.filter((a) => a.pageIndex === pageIndex);
    if (pageAnns.length === 0) return null;

    return pageAnns.map((ann) => {
      const css = pdfRectToCss(ann.rect, pageDim);

      if (ann.type === "note") {
        // Sticky note: fixed icon-sized square, standard yellow design
        const noteSize = 24 * zoom;
        return (
          <div
            key={ann.id}
            className="ann-note"
            style={{ left: css.left, top: css.top, width: noteSize, height: noteSize }}
          >
            <span className="ann-note-icon">&#9998;</span>
            <div className="ann-note-popup">{ann.content}</div>
          </div>
        );
      }

      if (ann.type === "highlight") {
        return (
          <div
            key={ann.id}
            className="annotation-overlay ann-highlight"
            style={{
              left: css.left, top: css.top, width: css.width, height: css.height,
              backgroundColor: ann.color + "50",
            }}
          />
        );
      }

      if (ann.type === "underline") {
        return (
          <div
            key={ann.id}
            className="annotation-overlay ann-underline"
            style={{
              left: css.left, top: css.top, width: css.width, height: css.height,
              borderBottomColor: ann.color,
            }}
          />
        );
      }

      if (ann.type === "strikeout") {
        return (
          <div
            key={ann.id}
            className="annotation-overlay ann-strikeout"
            style={{
              left: css.left, top: css.top, width: css.width, height: css.height,
              color: ann.color,
            }}
          />
        );
      }

      return null;
    });
  };

  const getDragOverlay = (pageIndex: number, pageDim: PageDimensions) => {
    if (!drag || drag.pageIndex !== pageIndex) return null;
    const css = pdfRectToCss(
      {
        left: Math.min(drag.startX, drag.currentX),
        right: Math.max(drag.startX, drag.currentX),
        bottom: Math.min(drag.startY, drag.currentY),
        top: Math.max(drag.startY, drag.currentY),
      },
      pageDim,
    );
    return (
      <div className="annotation-preview" style={{ left: css.left, top: css.top, width: css.width, height: css.height }} />
    );
  };

  const getMatchOverlays = (pageIndex: number, pageDim: PageDimensions) => {
    if (!searchResults) return null;
    return searchResults.matches.map((match, gi) => {
      if (match.pageIndex !== pageIndex) return null;
      const isCurrent = gi === currentMatchIndex;
      return match.rects.map((rect, ri) => {
        const css = pdfRectToCss(rect, pageDim);
        return (
          <div
            key={`${gi}-${ri}`}
            className={`search-highlight ${isCurrent ? "current" : ""}`}
            style={{ left: css.left, top: css.top, width: css.width, height: css.height }}
          />
        );
      });
    });
  };

  if (dimensions.length === 0) {
    return <div className="viewer"><div className="viewer-loading">Loading...</div></div>;
  }

  return (
    <div className={`viewer ${annotationMode ? "annotating" : ""}`} ref={containerRef}>
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
              className={`viewer-page-wrapper ${index === currentPage ? "current" : ""}`}
              style={{
                width: displayWidth,
                height: displayHeight,
                marginBottom: index < pageCount - 1 ? PAGE_GAP : 0,
              }}
              onMouseDown={(e) => { const el = pageRefs.current.get(index); if (el) handleMouseDown(e, index, el); }}
              onMouseMove={(e) => { const el = pageRefs.current.get(index); if (el) handleMouseMove(e, index, el); }}
              onMouseUp={handleMouseUp}
            >
              {imageUri ? (
                <img src={imageUri} alt={`Page ${index + 1}`} className="viewer-page" draggable={false} style={{ width: "100%", height: "100%" }} />
              ) : (
                <div className="viewer-page-placeholder"><span>{index + 1}</span></div>
              )}
              {getAnnotationOverlays(index, dim)}
              {searchResults && getMatchOverlays(index, dim)}
              {getDragOverlay(index, dim)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
