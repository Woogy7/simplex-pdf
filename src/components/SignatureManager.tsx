import { useState, useEffect, useRef, useCallback } from "react";
import {
  listSignatures,
  getSignatureImage,
  saveSignature,
  deleteSignature,
  type SignatureEntry,
} from "../lib/api";

type SigTab = "draw" | "upload" | "type";

const CURSIVE_FONTS = [
  { label: "Cursive", value: "cursive" },
  { label: "Brush Script", value: '"Brush Script MT", cursive' },
  { label: "Segoe Script", value: '"Segoe Script", cursive' },
  { label: "Comic Sans", value: '"Comic Sans MS", cursive' },
];

interface SignatureManagerProps {
  onClose: () => void;
  onSignatureSelect: (id: string, imageUri: string) => void;
  onReload: () => void;
}

export function SignatureManager({ onClose, onSignatureSelect, onReload }: SignatureManagerProps) {
  const [tab, setTab] = useState<SigTab>("draw");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Draw state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Upload state
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null);

  // Type state
  const [typedText, setTypedText] = useState("");
  const [typedFont, setTypedFont] = useState(CURSIVE_FONTS[0].value);

  // Saved signatures
  const [signatures, setSignatures] = useState<SignatureEntry[]>([]);
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());

  const loadSignatures = useCallback(async () => {
    try {
      const sigs = await listSignatures();
      setSignatures(sigs);
      const thumbMap = new Map<string, string>();
      for (const sig of sigs) {
        try {
          const uri = await getSignatureImage(sig.id);
          thumbMap.set(sig.id, uri);
        } catch {
          // Skip failed thumbnails
        }
      }
      setThumbnails(thumbMap);
    } catch (err) {
      console.warn("Could not load signatures:", err);
    }
  }, []);

  useEffect(() => {
    loadSignatures();
  }, [loadSignatures]);

  // Canvas setup
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [tab]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const getCanvasDataUrl = (): string => canvasRef.current?.toDataURL("image/png") ?? "";

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const renderTypedSignature = (text: string, font: string): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.font = `36px ${font}`;
    ctx.fillStyle = "#000";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 10, 50);
    return canvas.toDataURL("image/png");
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    let pngBase64 = "";
    let sigType = "";

    if (tab === "draw") {
      pngBase64 = getCanvasDataUrl();
      sigType = "drawn";
    } else if (tab === "upload") {
      if (!uploadDataUrl) return;
      pngBase64 = uploadDataUrl;
      sigType = "uploaded";
    } else {
      if (!typedText.trim()) return;
      pngBase64 = renderTypedSignature(typedText, typedFont);
      sigType = "typed";
    }

    // Strip the data URI prefix - backend expects raw base64
    const base64Only = pngBase64.replace(/^data:image\/\w+;base64,/, "");

    setSaving(true);
    try {
      await saveSignature(name.trim(), base64Only, sigType);
      setName("");
      setUploadDataUrl(null);
      setTypedText("");
      clearCanvas();
      await loadSignatures();
      onReload();
    } catch (err) {
      console.error("Failed to save signature:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSignature(id);
      await loadSignatures();
      onReload();
    } catch (err) {
      console.error("Failed to delete signature:", err);
    }
  };

  const handlePlace = async (id: string) => {
    const uri = thumbnails.get(id);
    if (uri) {
      onSignatureSelect(id, uri);
    } else {
      try {
        const freshUri = await getSignatureImage(id);
        onSignatureSelect(id, freshUri);
      } catch (err) {
        console.error("Failed to get signature image:", err);
      }
    }
  };

  return (
    <div className="signature-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="signature-modal">
        <div className="signature-modal-header">
          <h3>Signatures</h3>
          <button className="toolbar-btn" onClick={onClose}>Close</button>
        </div>

        <div className="signature-modal-tabs">
          <button
            className={`signature-modal-tab ${tab === "draw" ? "active" : ""}`}
            onClick={() => setTab("draw")}
          >
            Draw
          </button>
          <button
            className={`signature-modal-tab ${tab === "upload" ? "active" : ""}`}
            onClick={() => setTab("upload")}
          >
            Upload
          </button>
          <button
            className={`signature-modal-tab ${tab === "type" ? "active" : ""}`}
            onClick={() => setTab("type")}
          >
            Type
          </button>
        </div>

        <div className="signature-modal-body">
          {tab === "draw" && (
            <>
              <div className="signature-canvas-container">
                <canvas
                  ref={canvasRef}
                  width={448}
                  height={120}
                  className="signature-canvas"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                />
              </div>
              <div className="signature-actions">
                <button onClick={clearCanvas}>Clear</button>
              </div>
            </>
          )}

          {tab === "upload" && (
            <>
              <div className="signature-actions">
                <label className="toolbar-btn" style={{ cursor: "pointer" }}>
                  Choose File
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
              {uploadDataUrl && (
                <div className="signature-preview">
                  <img src={uploadDataUrl} alt="Uploaded signature" />
                </div>
              )}
            </>
          )}

          {tab === "type" && (
            <>
              <input
                type="text"
                className="signature-name-input"
                placeholder="Type your signature..."
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
              />
              <div className="signature-actions">
                <select
                  value={typedFont}
                  onChange={(e) => setTypedFont(e.target.value)}
                  style={{
                    padding: "6px 8px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: "12px",
                  }}
                >
                  {CURSIVE_FONTS.map((f) => (
                    <option key={f.label} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              {typedText && (
                <div className="signature-preview">
                  <span style={{ fontFamily: typedFont, fontSize: "36px", color: "#000" }}>
                    {typedText}
                  </span>
                </div>
              )}
            </>
          )}

          <input
            type="text"
            className="signature-name-input"
            placeholder="Signature name (required)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="signature-actions">
            <button className="primary" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? "Saving..." : "Save Signature"}
            </button>
          </div>

          {signatures.length > 0 && (
            <div className="signature-list">
              <h4>Saved Signatures</h4>
              {signatures.map((sig) => (
                <div key={sig.id} className="signature-list-item">
                  {thumbnails.has(sig.id) ? (
                    <img src={thumbnails.get(sig.id)} alt={sig.name} />
                  ) : (
                    <span style={{ width: 80, height: 30, display: "inline-block" }} />
                  )}
                  <div className="signature-list-item-info">
                    <div>{sig.name}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>
                      {sig.sigType}
                    </div>
                  </div>
                  <button className="place-btn" onClick={() => handlePlace(sig.id)}>
                    Place
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(sig.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SignatureManager;
