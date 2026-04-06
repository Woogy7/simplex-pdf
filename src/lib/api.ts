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

export interface AnnotationColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Data sent to the backend when saving annotations. */
export interface AnnotationData {
  pageIndex: number;
  annotationType: string;
  rect: { left: number; top: number; right: number; bottom: number };
  color: AnnotationColor;
  content?: string;
}

/** Writes all annotations to the PDF and saves to disk. */
export async function saveWithAnnotations(
  annotations: AnnotationData[],
): Promise<void> {
  return invoke("save_with_annotations", { annotations });
}

/** Saves the current PDF to disk without new annotations. */
export async function savePdf(): Promise<void> {
  return invoke("save_pdf");
}
