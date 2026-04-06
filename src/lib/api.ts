import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface DocumentInfo {
  title: string | null;
  author: string | null;
  pageCount: number;
  filePath: string;
}

export interface PageDimensions {
  width: number;
  height: number;
}

/** Opens a native file picker and returns the selected PDF path, or null. */
export async function pickPdfFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    filters: [{ name: "PDF Files", extensions: ["pdf"] }],
  });
  if (typeof result === "string") return result;
  return null;
}

/** Opens a PDF file in the backend and returns document info. */
export async function openFile(path: string): Promise<DocumentInfo> {
  return invoke("open_file", { path });
}

/** Returns the page count of the currently open document. */
export async function getPageCount(): Promise<number> {
  return invoke("get_page_count");
}

/** Returns document metadata. */
export async function getDocumentInfo(): Promise<DocumentInfo> {
  return invoke("get_document_info");
}

/** Renders a page as a base64 PNG data URI. */
export async function renderPage(
  pageIndex: number,
  scale: number = 1.0,
): Promise<string> {
  return invoke("render_page", { pageIndex, scale });
}

/** Returns dimensions of all pages. */
export async function getPageDimensions(): Promise<PageDimensions[]> {
  return invoke("get_page_dimensions");
}

export interface MatchRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SearchMatch {
  pageIndex: number;
  rects: MatchRect[];
}

export interface SearchResults {
  query: string;
  totalMatches: number;
  matches: SearchMatch[];
}

/** Searches the document for the given query. */
export async function searchText(
  query: string,
  caseSensitive: boolean = false,
  wholeWord: boolean = false,
): Promise<SearchResults> {
  return invoke("search_text", { query, caseSensitive, wholeWord });
}

export interface AnnotationRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface AnnotationColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface InkPoint {
  x: number;
  y: number;
}

/** Adds a markup annotation (highlight, underline, strikeout). */
export async function addMarkup(
  pageIndex: number,
  annotationType: string,
  rect: AnnotationRect,
  color: AnnotationColor,
): Promise<void> {
  return invoke("add_markup", { pageIndex, annotationType, rect, color });
}

/** Adds a text note (sticky note) annotation. */
export async function addNote(
  pageIndex: number,
  rect: AnnotationRect,
  content: string,
  color: AnnotationColor,
): Promise<void> {
  return invoke("add_note", { pageIndex, rect, content, color });
}

/** Adds an ink (freehand drawing) annotation. */
export async function addInk(
  pageIndex: number,
  points: InkPoint[],
  color: AnnotationColor,
  width: number,
): Promise<void> {
  return invoke("add_ink", { pageIndex, points, color, width });
}

/** Saves the current PDF to disk. */
export async function savePdf(): Promise<void> {
  return invoke("save_pdf");
}
