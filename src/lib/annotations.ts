/** Frontend annotation state — rendered as overlays, persisted to PDF on save. */

export interface Annotation {
  id: string;
  pageIndex: number;
  type: "highlight" | "underline" | "strikeout" | "note";
  /** Bounding rect in PDF points (origin = bottom-left). */
  rect: { left: number; top: number; right: number; bottom: number };
  color: string;
  /** Text content (for sticky notes). */
  content?: string;
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
