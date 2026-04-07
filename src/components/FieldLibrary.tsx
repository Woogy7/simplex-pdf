import { useState, useRef, useCallback } from "react";
import type { FieldLibrary as FieldLibraryType, Category, FieldEntry } from "../lib/api";
import {
  addLibraryEntry,
  updateLibraryEntry,
  deleteLibraryEntry,
  addLibraryCategory,
  deleteLibraryCategory,
  importLibrary,
  exportLibrary,
} from "../lib/api";

interface FieldLibraryProps {
  library: FieldLibraryType | null;
  onReload: () => void;
}

interface EntryFormState {
  categoryId: string;
  entryId: string | null; // null = adding new, string = editing existing
  label: string;
  value: string;
  tags: string;
}

export function FieldLibrary({ library, onReload }: FieldLibraryProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editForm, setEditForm] = useState<EntryFormState | null>(null);
  const [addCategoryName, setAddCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const startAdd = useCallback((categoryId: string) => {
    setEditForm({ categoryId, entryId: null, label: "", value: "", tags: "" });
  }, []);

  const startEdit = useCallback((categoryId: string, entry: FieldEntry) => {
    setEditForm({
      categoryId,
      entryId: entry.id,
      label: entry.label,
      value: entry.value,
      tags: entry.tags.join(", "),
    });
  }, []);

  const cancelForm = useCallback(() => {
    setEditForm(null);
  }, []);

  const submitForm = useCallback(async () => {
    if (!editForm) return;
    const tags = editForm.tags
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      if (editForm.entryId) {
        await updateLibraryEntry(editForm.entryId, editForm.label, editForm.value, tags);
      } else {
        await addLibraryEntry(editForm.categoryId, editForm.label, editForm.value, tags);
      }
      setEditForm(null);
      onReload();
    } catch (err) {
      console.error("Failed to save entry:", err);
    }
  }, [editForm, onReload]);

  const handleDeleteEntry = useCallback(async (entryId: string) => {
    try {
      await deleteLibraryEntry(entryId);
      onReload();
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  }, [onReload]);

  const handleAddCategory = useCallback(async () => {
    if (!addCategoryName.trim()) return;
    try {
      await addLibraryCategory(addCategoryName.trim());
      setAddCategoryName("");
      setShowAddCategory(false);
      onReload();
    } catch (err) {
      console.error("Failed to add category:", err);
    }
  }, [addCategoryName, onReload]);

  const handleDeleteCategory = useCallback(async (categoryId: string) => {
    try {
      await deleteLibraryCategory(categoryId);
      onReload();
    } catch (err) {
      console.error("Failed to delete category:", err);
    }
  }, [onReload]);

  const handleExport = useCallback(async () => {
    try {
      const json = await exportLibrary();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "field-library.json";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export library:", err);
    }
  }, []);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importLibrary(text);
      onReload();
    } catch (err) {
      console.error("Failed to import library:", err);
    }
    // Reset so the same file can be re-selected
    e.target.value = "";
  }, [onReload]);

  const filterEntries = useCallback((entries: FieldEntry[]): FieldEntry[] => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(entry =>
      entry.label.toLowerCase().includes(q) ||
      entry.value.toLowerCase().includes(q) ||
      entry.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [search]);

  const renderEntryForm = () => {
    if (!editForm) return null;
    return (
      <div className="field-library-form">
        <input
          type="text"
          placeholder="Label"
          value={editForm.label}
          onChange={e => setEditForm({ ...editForm, label: e.target.value })}
          autoFocus
        />
        <input
          type="text"
          placeholder="Value"
          value={editForm.value}
          onChange={e => setEditForm({ ...editForm, value: e.target.value })}
        />
        <input
          type="text"
          placeholder="Tags (comma-separated)"
          value={editForm.tags}
          onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
          onKeyDown={e => { if (e.key === "Enter") submitForm(); }}
        />
        <div className="field-library-entry-actions">
          <button onClick={submitForm}>
            {editForm.entryId ? "Update" : "Add"}
          </button>
          <button onClick={cancelForm}>Cancel</button>
        </div>
      </div>
    );
  };

  const renderCategory = (category: Category) => {
    const isCollapsed = collapsed.has(category.id);
    const filteredEntries = filterEntries(category.fields);
    const isFormForCategory = editForm?.categoryId === category.id;

    return (
      <div key={category.id} className="field-library-category">
        <div
          className="field-library-category-header"
          onClick={() => toggleCategory(category.id)}
        >
          <span>{isCollapsed ? "\u25B6" : "\u25BC"} {category.name} ({category.fields.length})</span>
          <span style={{ display: "flex", gap: "4px" }}>
            <button
              className="toolbar-btn"
              style={{ fontSize: "10px", padding: "1px 4px" }}
              onClick={(e) => { e.stopPropagation(); startAdd(category.id); }}
              title="Add entry"
            >
              +
            </button>
            <button
              className="toolbar-btn"
              style={{ fontSize: "10px", padding: "1px 4px" }}
              onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}
              title="Delete category"
            >
              x
            </button>
          </span>
        </div>

        {!isCollapsed && (
          <>
            {isFormForCategory && renderEntryForm()}
            {filteredEntries.map(entry => (
              <div key={entry.id} className="field-library-entry">
                <span className="field-library-entry-label">{entry.label}</span>
                <span className="field-library-entry-value">
                  {entry.value.length > 50 ? entry.value.slice(0, 50) + "..." : entry.value}
                </span>
                {entry.tags.length > 0 && (
                  <div className="field-library-entry-tags">
                    {entry.tags.map((tag, i) => (
                      <span key={i} className="field-library-tag">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="field-library-entry-actions">
                  <button onClick={() => startEdit(category.id, entry)}>Edit</button>
                  <button onClick={() => handleDeleteEntry(entry.id)}>Del</button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <aside className="field-library-panel">
      <div className="field-library-header">
        <h3>Field Library</h3>
        <input
          type="text"
          className="field-library-search"
          placeholder="Filter entries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="field-library-categories">
        {showAddCategory && (
          <div className="field-library-form">
            <input
              type="text"
              placeholder="Category name"
              value={addCategoryName}
              onChange={e => setAddCategoryName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddCategory(); }}
              autoFocus
            />
            <div className="field-library-entry-actions">
              <button onClick={handleAddCategory}>Add</button>
              <button onClick={() => { setShowAddCategory(false); setAddCategoryName(""); }}>Cancel</button>
            </div>
          </div>
        )}

        {!showAddCategory && (
          <div style={{ padding: "4px 12px" }}>
            <button
              className="toolbar-btn"
              style={{ fontSize: "11px", width: "100%" }}
              onClick={() => setShowAddCategory(true)}
            >
              + Add Category
            </button>
          </div>
        )}

        {library?.categories.map(cat => renderCategory(cat))}

        {library && library.categories.length === 0 && (
          <div style={{ padding: "16px 12px", color: "var(--text-secondary)", fontSize: "12px", textAlign: "center" }}>
            No categories yet. Add one to get started.
          </div>
        )}
      </div>

      <div className="field-library-footer">
        <button onClick={handleImport}>Import</button>
        <button onClick={handleExport}>Export</button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />
    </aside>
  );
}
