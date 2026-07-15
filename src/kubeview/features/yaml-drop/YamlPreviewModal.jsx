import { useState } from "react";
import { applyYaml } from "../../api";
import { mono } from "../../theme";
import { Spinner } from "../../components/ui/Spinner";

const COMMON_NAMESPACES = ["default", "kube-system", "kube-public", "kube-node-lease"];

export function YamlPreviewModal({ open, yamlContent, fileName, clusterId, onClose }) {
  const [namespace, setNamespace] = useState("");
  const [namespaceInput, setNamespaceInput] = useState("");
  const [useCustomNs, setUseCustomNs] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  if (!open) return null;

  const effectiveNamespace = useCustomNs ? namespaceInput : namespace;

  const handleApply = async () => {
    setApplying(true);
    setResult(null);
    try {
      const res = await applyYaml(clusterId, yamlContent, effectiveNamespace || null);
      setResult({ ok: true, message: res });
    } catch (err) {
      setResult({ ok: false, message: String(err) });
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    setNamespace("");
    setNamespaceInput("");
    setUseCustomNs(false);
    setResult(null);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        zIndex: 2500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.13s ease",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: "#0a0f18",
          border: "1px solid #0e1f2e",
          borderRadius: 8,
          width: "min(720px, 92vw)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.95)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid #0a1420",
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "0.71rem", color: "#39ff8a", ...mono }}>
            📄 {fileName || "YAML preview"}
          </span>
          <button
            type="button"
            onClick={handleClose}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "1px solid #1a1a2e",
              borderRadius: 3,
              color: "#4a7a8a",
              cursor: "pointer",
              padding: "2px 8px",
              ...mono,
              fontSize: "0.67rem",
            }}
          >
            ✕ close
          </button>
        </div>

        {/* YAML content */}
        <div style={{ flex: 1, overflow: "auto", padding: "10px 14px", minHeight: 200 }}>
          <pre
            style={{
              margin: 0,
              ...mono,
              fontSize: "0.71rem",
              lineHeight: 1.9,
              whiteSpace: "pre-wrap",
              background: "#020408",
              border: "1px solid #0e1f2e",
              borderRadius: 4,
              padding: 10,
            }}
          >
            {yamlContent.split("\n").map((line, i) => {
              const ind = line.match(/^(\s*)/)?.[1]?.length ?? 0;
              let c = "#4a7a8a";
              if (line.trim().startsWith("#")) c = "#1e3a52";
              else if (ind === 0 && /\w+:/.test(line)) c = "#7dd3fc";
              else if (ind <= 2 && /\w+:/.test(line)) c = "#c4b5fd";
              else if (/\w+:/.test(line)) c = "#a5f3fc";
              else if (/^(\s*)-/.test(line)) c = "#86efac";
              else c = "#fde68a";
              return (
                <span key={i} style={{ color: c, display: "block" }}>
                  {line}
                </span>
              );
            })}
          </pre>
        </div>

        {/* Namespace override + Apply */}
        <div
          style={{
            padding: "10px 14px",
            borderTop: "1px solid #0a1420",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          {/* Namespace selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ ...mono, fontSize: "0.65rem", color: "#4a7a8a" }}>
              Namespace:
            </span>
            {!useCustomNs ? (
              <select
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                style={{
                  background: "#080e18",
                  border: "1px solid #0e1f2e",
                  borderRadius: 3,
                  color: "#7dd3fc",
                  padding: "2px 6px",
                  ...mono,
                  fontSize: "0.68rem",
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: 160,
                }}
              >
                <option value="">— use from YAML —</option>
                {COMMON_NAMESPACES.map((ns) => (
                  <option key={ns} value={ns}>{ns}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={namespaceInput}
                onChange={(e) => setNamespaceInput(e.target.value)}
                placeholder="custom namespace"
                style={{
                  background: "#080e18",
                  border: "1px solid #0e1f2e",
                  borderRadius: 3,
                  color: "#7dd3fc",
                  padding: "2px 6px",
                  ...mono,
                  fontSize: "0.68rem",
                  outline: "none",
                  width: 140,
                }}
              />
            )}
            <button
              type="button"
              onClick={() => { setUseCustomNs((p) => !p); setNamespace(""); setNamespaceInput(""); }}
              style={{
                background: "none",
                border: "none",
                color: "#4a7a8a",
                cursor: "pointer",
                ...mono,
                fontSize: "0.6rem",
                textDecoration: "underline",
              }}
            >
              {useCustomNs ? "pick" : "custom"}
            </button>
          </div>

          <div style={{ flex: 1 }} />

          {/* Result message */}
          {result && (
            <span
              style={{
                ...mono,
                fontSize: "0.68rem",
                color: result.ok ? "#39ff8a" : "#ff6b6b",
                maxWidth: 280,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {result.ok ? "✅ " : "❌ "}{result.message}
            </span>
          )}

          {/* Apply button */}
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            style={{
              background: applying ? "#0a1a0a" : "none",
              border: "1px solid #1a3a1a",
              borderRadius: 3,
              color: applying ? "#1e3a52" : "#39ff8a",
              cursor: applying ? "not-allowed" : "pointer",
              padding: "4px 14px",
              ...mono,
              fontSize: "0.7rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {applying && <Spinner />}
            {applying ? "applying…" : "▶ apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
