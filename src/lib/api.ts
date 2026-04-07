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

export interface StrokePoint {
  x: number;
  y: number;
}

export interface InkStrokeData {
  points: StrokePoint[];
  strokeWidth: number;
}

/** Data sent to the backend when saving annotations. */
export interface AnnotationData {
  pageIndex: number;
  annotationType: string;
  rect: { left: number; top: number; right: number; bottom: number };
  color: AnnotationColor;
  content?: string;
  inkStroke?: InkStrokeData;
}

/** Existing annotation read from the PDF. */
export interface ExistingAnnotation {
  pageIndex: number;
  annotationType: string;
  rect: { left: number; top: number; right: number; bottom: number };
  color: string;
  content: string | null;
  inkStroke?: InkStrokeData;
}

/** Reads all existing annotations from the currently open document. */
export async function getAnnotations(): Promise<ExistingAnnotation[]> {
  return invoke("get_annotations");
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

// --- Form Fields ---

export interface FormFieldInfo {
  pageIndex: number;
  fieldIndex: number;
  fieldType: "text" | "checkbox" | "radio" | "combobox" | "listbox" | "pushbutton" | "signature" | "unknown";
  name: string | null;
  value: string | null;
  isChecked: boolean | null;
  isReadOnly: boolean;
  isRequired: boolean;
  rect: { left: number; top: number; right: number; bottom: number };
  options: { label: string | null; isSelected: boolean }[] | null;
}

export interface FormFieldUpdate {
  pageIndex: number;
  fieldIndex: number;
  value?: string | null;
  isChecked?: boolean | null;
}

/** Returns all form fields in the currently open document. */
export async function getFormFields(): Promise<FormFieldInfo[]> {
  return invoke("get_form_fields");
}

/** Returns whether the currently open document has a form. */
export async function hasForm(): Promise<boolean> {
  return invoke("has_form");
}

/** Saves form field value updates to the PDF. */
export async function setFormFieldValues(updates: FormFieldUpdate[]): Promise<void> {
  return invoke("set_form_field_values", { updates });
}

// --- Flat Text Fields ---

/** A flat-text field placement for non-interactive PDFs. */
export interface FlatTextField {
  pageIndex: number;
  text: string;
  rect: { left: number; top: number; right: number; bottom: number };
  fontSize: number;
}

/** Saves flat text fields as FreeText annotations on the PDF. */
export async function saveFlatTextFields(fields: FlatTextField[]): Promise<void> {
  return invoke("save_flat_text_fields", { fields });
}

// --- Field Library ---

/** A single entry in the field library. */
export interface FieldEntry {
  id: string;
  label: string;
  value: string;
  tags: string[];
}

/** A category containing field entries. */
export interface Category {
  id: string;
  name: string;
  fields: FieldEntry[];
}

/** The full field library structure. */
export interface FieldLibrary {
  version: number;
  categories: Category[];
}

/** Returns the full field library. */
export async function getFieldLibrary(): Promise<FieldLibrary> {
  return invoke("get_field_library");
}

/** Adds a new entry to a category. */
export async function addLibraryEntry(
  categoryId: string, label: string, value: string, tags: string[],
): Promise<FieldEntry> {
  return invoke("add_library_entry", { categoryId, label, value, tags });
}

/** Updates an existing library entry. */
export async function updateLibraryEntry(
  entryId: string, label: string, value: string, tags: string[],
): Promise<void> {
  return invoke("update_library_entry", { entryId, label, value, tags });
}

/** Deletes a library entry by ID. */
export async function deleteLibraryEntry(entryId: string): Promise<void> {
  return invoke("delete_library_entry", { entryId });
}

/** Adds a new category to the library. */
export async function addLibraryCategory(name: string): Promise<Category> {
  return invoke("add_library_category", { name });
}

/** Deletes a category by ID. */
export async function deleteLibraryCategory(categoryId: string): Promise<void> {
  return invoke("delete_library_category", { categoryId });
}

/** Imports a field library from a JSON string. */
export async function importLibrary(json: string): Promise<void> {
  return invoke("import_library", { json });
}

/** Exports the field library as a JSON string. */
export async function exportLibrary(): Promise<string> {
  return invoke("export_library");
}
