import { useState, useEffect, useRef, useCallback } from "react";
import {
  renderPage,
  type PageDimensions,
  type SearchResults,
} from "../lib/api";

interface ViewerProps {
  currentPage: number;
  pageCount: number;
  dimensions: PageDimensions[];
  zoom: number;
  searchResults: SearchResults | null;
  currentMatchIndex: number;
  onPageChange: (page: number) => void;
}

const PAGE_GAP = 16;
const BUFFER_PAGES = 1;

export default function Viewer({
  currentPage,
  pageCount,
  dimensions,
  zoom,
  searchResults,
  currentMatchIndex,
  onPageChange,
}: ViewerProps) {
  const [renderedPages, setRenderedPages] = useState<Map<number, string>>(
    new Map(),
  );
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([0]));
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollingToRef = useRef(false);

  // Reset state when document changes
  useEffect(() => {
    setRenderedPages(new Map());
    setVisiblePages(new Set([0]));
  }, [pageCount]);

  // Set up intersection observer to detect visible pages
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

  // Update current page based on scroll position
  useEffect(() => {
    if (visiblePages.size === 0 || scrollingToRef.current) return;
    const sorted = Array.from(visiblePages).sort((a, b) => a - b);
    const topVisible = sorted[0];
    if (topVisible !== undefined && topVisible !== currentPage) {
      onPageChange(topVisible);
    }
  }, [visiblePages, currentPage, onPageChange]);

  // Scroll to page when currentPage changes from external navigation
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
    for (const pageIndex of toRender) {
      if (renderedPages.has(pageIndex)) {
        const cached = renderedPages.get(pageIndex)!;
        if (cached.startsWith(`scale:${scale}:`)) continue;
      }

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
  }, [visiblePages, dimensions, zoom, pageCount, renderedPages]);

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
    const colonIdx = entry.indexOf(":", 6);
    return colonIdx >= 0 ? entry.substring(colonIdx + 1) : null;
  };

  // Get search match overlays for a specific page
  const getMatchOverlays = (pageIndex: number, pageDim: PageDimensions) => {
    if (!searchResults) return null;
    const pageMatches = searchResults.matches.filter(
      (m) => m.pageIndex === pageIndex,
    );
    if (pageMatches.length === 0) return null;

    return searchResults.matches.map((match, gi) => {
      if (match.pageIndex !== pageIndex) return null;
      const isCurrent = gi === currentMatchIndex;

      return match.rects.map((rect, ri) => {
        // Convert PDF points (origin bottom-left) to CSS (origin top-left)
        const scaleX = zoom / 1; // pageDim is already in points
        const left = rect.left * scaleX;
        const top = (pageDim.height - rect.top) * scaleX;
        const width = (rect.right - rect.left) * scaleX;
        const height = (rect.top - rect.bottom) * scaleX;

        return (
          <div
            key={`${gi}-${ri}`}
            className={`search-highlight ${isCurrent ? "current" : ""}`}
            style={{
              left,
              top,
              width,
              height,
            }}
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
    <div className="viewer" ref={containerRef}>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
