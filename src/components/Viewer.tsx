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
  // Tracks whether we're programmatically scrolling (suppresses scroll-based page tracking)
  const scrollingToRef = useRef(false);
  // Tracks in-flight render requests to avoid duplicate fetches
  const renderingRef = useRef<Set<string>>(new Set());

  // Reset state when document changes
  useEffect(() => {
    setRenderedPages(new Map());
    setVisiblePages(new Set([0]));
    renderingRef.current.clear();
  }, [pageCount]);

  // Clear render cache when zoom changes so pages re-render at new resolution
  useEffect(() => {
    renderingRef.current.clear();
  }, [zoom]);

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

  // Update current page from scroll position (only when user is scrolling, not programmatic)
  useEffect(() => {
    if (visiblePages.size === 0 || scrollingToRef.current) return;
    const sorted = Array.from(visiblePages).sort((a, b) => a - b);
    const topVisible = sorted[0];
    if (topVisible !== undefined && topVisible !== currentPage) {
      onPageChange(topVisible);
    }
  }, [visiblePages]); // eslint-disable-line react-hooks/exhaustive-deps
  // Intentionally only depends on visiblePages — including currentPage/onPageChange causes loops

  // Scroll to page on external navigation (toolbar arrows, thumbnail click, etc.)
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
      // Give the browser time to scroll and the IntersectionObserver time to fire + settle
      setTimeout(() => {
        scrollingToRef.current = false;
      }, 300);
    }
  }, [currentPage]);

  // Scroll to current search match within the page
  useEffect(() => {
    if (!searchResults || searchResults.matches.length === 0) return;
    const match = searchResults.matches[currentMatchIndex];
    if (!match) return;

    const pageEl = pageRefs.current.get(match.pageIndex);
    const container = containerRef.current;
    if (!pageEl || !container) return;

    // Wait a tick for the page scroll to finish, then scroll to the match
    setTimeout(() => {
      const pageRect = pageEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const dim = dimensions[match.pageIndex];
      if (!dim) return;

      // Convert first match rect from PDF coords to pixel offset within the page
      const firstRect = match.rects[0];
      if (!firstRect) return;

      const matchTopPx = (dim.height - firstRect.top) * zoom;
      const matchLeftPx = firstRect.left * zoom;

      // Absolute position of the match in the viewport
      const matchAbsTop = pageRect.top + matchTopPx;
      const matchAbsLeft = pageRect.left + matchLeftPx;

      // Check if match is visible in the container viewport
      const isVisible =
        matchAbsTop >= containerRect.top &&
        matchAbsTop <= containerRect.bottom - 40 &&
        matchAbsLeft >= containerRect.left &&
        matchAbsLeft <= containerRect.right - 40;

      if (!isVisible) {
        scrollingToRef.current = true;
        // Scroll so the match is roughly centered
        container.scrollTo({
          top:
            container.scrollTop +
            (matchAbsTop - containerRect.top) -
            containerRect.height / 3,
          left:
            container.scrollLeft +
            (matchAbsLeft - containerRect.left) -
            containerRect.width / 3,
          behavior: "auto",
        });
        setTimeout(() => {
          scrollingToRef.current = false;
        }, 300);
      }
    }, 50);
  }, [searchResults, currentMatchIndex, zoom, dimensions]);

  // Render visible pages + buffer
  // NOTE: renderedPages is NOT in the dependency array to avoid render cascades.
  // We use renderingRef to track in-flight requests instead.
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

    const scale = zoom;
    const version = renderVersion;
    for (const pageIndex of toRender) {
      const cacheKey = `v${version}:${scale}:${pageIndex}`;

      // Skip if already rendered or currently rendering
      if (renderingRef.current.has(cacheKey)) continue;
      renderingRef.current.add(cacheKey);

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
  }, [visiblePages, dimensions, zoom, pageCount, renderVersion]);

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
    const dataIdx = entry.indexOf("data:");
    return dataIdx >= 0 ? entry.substring(dataIdx) : null;
  };

  const mouseToPdf = (
    e: React.MouseEvent,
    pageIndex: number,
    pageEl: HTMLDivElement,
  ) => {
    const rect = pageEl.getBoundingClientRect();
    const dim = dimensions[pageIndex];
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const pdfX = cssX / zoom;
    const pdfY = dim.height - cssY / zoom;
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

    const width = rect.right - rect.left;
    const height = rect.top - rect.bottom;

    try {
      if (annotationMode === "note") {
        const content = window.prompt("Enter note text:");
        if (content) {
          await addNote(
            drag.pageIndex,
            {
              left: drag.startX,
              top: drag.startY + 24,
              right: drag.startX + 24,
              bottom: drag.startY,
            },
            content,
            { ...color, a: 255 },
          );
          renderingRef.current.clear();
          setRenderedPages((prev) => {
            const next = new Map(prev);
            next.delete(drag.pageIndex);
            return next;
          });
          setRenderVersion((v) => v + 1);
        }
      } else if (width > 2 && height > 2) {
        await addMarkup(drag.pageIndex, annotationMode, rect, color);
        renderingRef.current.clear();
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
