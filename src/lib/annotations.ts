/** Frontend annotation state — rendered as overlays, persisted to PDF on save. */

export interface StrokePoint {
  x: number;
  y: number;
}

export interface InkStrokeData {
  points: StrokePoint[];
  strokeWidth: number;
}

export interface Annotation {
  id: string;
  pageIndex: number;
  type: "highlight" | "underline" | "strikeout" | "note" | "ink";
  /** Bounding rect in PDF points (origin = bottom-left). */
  rect: { left: number; top: number; right: number; bottom: number };
  color: string;
  /** Text content (for sticky notes). */
  content?: string;
  /** Ink stroke data (for freehand drawings). */
  inkStroke?: InkStrokeData;
}

let nextId = 1;

export function createAnnotation(
  pageIndex: number,
  type: Annotation["type"],
  rect: Annotation["rect"],
  color: string,
  content?: string,
): Annotation {
  return {
    id: `ann-${nextId++}`,
    pageIndex,
    type,
    rect,
    color,
    content,
  };
}

/** Creates an ink annotation by computing the bounding rect from the points array. */
export function createInkAnnotation(
  pageIndex: number,
  points: StrokePoint[],
  color: string,
  strokeWidth: number,
): Annotation {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const halfWidth = strokeWidth / 2;
  const rect = {
    left: Math.min(...xs) - halfWidth,
    top: Math.max(...ys) + halfWidth,
    right: Math.max(...xs) + halfWidth,
    bottom: Math.min(...ys) - halfWidth,
  };
  return {
    id: `ann-${nextId++}`,
    pageIndex,
    type: "ink",
    rect,
    color,
    inkStroke: { points, strokeWidth },
  };
}
