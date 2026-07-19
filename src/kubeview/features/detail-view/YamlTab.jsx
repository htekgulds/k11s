import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyYaml, k8sInvoke } from "../../api";
import { exportContent } from "../../api/export";
import { mono } from "../../theme";
import { Spinner } from "../../components/ui/Spinner";

export function YamlTab({ obj, type, clusterId }) {
  const [yaml, setYaml] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [hideMF, setHideMF] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [copied, setCopied] = useState(false);
  const searchRef = useRef(null);

  const load = useCallback(
    async (omit) => {
      setFetching(true);
      setResult(null);
      try {
        const res = await k8sInvoke(
          "get_yaml",
          { kind: type, name: obj.name, namespace: obj.namespace || null, omitManagedFields: omit },
          clusterId,
        );
        setYaml(res);
      } catch (err) {
        setYaml({ error: String(err) });
      } finally {
        setFetching(false);
      }
    },
    [type, obj.name, obj.namespace, clusterId],
  );

  useEffect(() => { load(hideMF); }, [hideMF, load]);

  const handleEdit = () => {
    setEditContent(yaml?.yaml || "");
    setEditing(true);
    setResult(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditContent("");
    setResult(null);
  };

  const handleApply = async () => {
    setApplying(true);
    setResult(null);
    try {
      const res = await applyYaml(clusterId, editContent);
      setResult({ ok: true, message: res });
      setEditing(false);
      load(hideMF);
    } catch (err) {
      setResult({ ok: false, message: String(err) });
    } finally {
      setApplying(false);
    }
  };

  const handleCopy = async () => {
    const text = yaml?.yaml || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  const display = editing ? editContent : (yaml?.error || yaml?.yaml || "");
  const lines = useMemo(() => display.split("\n"), [display]);

  // Highlight search matches
  const highlightLine = (line, i) => {
    if (!searchText) return <span>{line}</span>;
    const parts = line.split(new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
    if (parts.length === 1) return <span>{line}</span>;
    return (
      <span>
        {parts.map((p, j) =>
          p.toLowerCase() === searchText.toLowerCase()
            ? <span key={j} style={{ background: "#ffd70033", color: "#ffd700", borderRadius: 2 }}>{p}</span>
            : <span key={j}>{p}</span>
        )}
      </span>
    );
  };

  // Syntax color for YAML keys
  const lineColor = (line) => {
    const ind = line.match(/^(\s*)/)?.[1]?.length ?? 0;
    if (line.trim().startsWith("#")) return "#1e3a52";
    if (ind === 0 && /\w+:/.test(line)) return "#7dd3fc";
    if (ind <= 2 && /\w+:/.test(line)) return "#c4b5fd";
    if (/\w+:/.test(line)) return "#a5f3fc";
    if (/^(\s*)-/.test(line)) return "#86efac";
    return "#fde68a";
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div
        style={{
          padding: "5px 13px",
          borderBottom: "1px solid #0a1018",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "#050910",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "0.59rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#1e3a52",
            ...mono,
          }}
        >
          {editing ? "editing" : "manifest"}
        </span>

        {!editing && (
          <>
            <button
              type="button"
              onClick={() => setHideMF((p) => !p)}
              style={{
                background: "none",
                border: "1px solid #0e1f2e",
                borderRadius: 3,
                color: hideMF ? "#1e3a52" : "#7dd3fc",
                cursor: "pointer",
                padding: "2px 7px",
                ...mono,
                fontSize: "0.67rem",
              }}
            >
              {hideMF ? "show managed fields" : "hide managed fields"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                background: "none",
                border: "1px solid #0e1f2e",
                borderRadius: 3,
                color: copied ? "#39ff8a" : "#4a7a8a",
                cursor: "pointer",
                padding: "2px 7px",
                ...mono,
                fontSize: "0.67rem",
              }}
            >
              {copied ? "✓ copied" : "📋 copy"}
            </button>
            <button
              type="button"
              onClick={() => exportContent(
                yaml?.yaml || "",
                `${type}_${obj.name}.yaml`,
                [{ name: "YAML", extensions: ["yaml"] }],
              )}
              style={{
                background: "none",
                border: "1px solid #0e1f2e",
                borderRadius: 3,
                color: "#4a7a8a",
                cursor: "pointer",
                padding: "2px 7px",
                ...mono,
                fontSize: "0.67rem",
              }}
              title="Export to file"
            >
              ⬇ export
            </button>
            {/* Search input */}
            <input
              ref={searchRef}
              type="text"
              placeholder="Search YAML…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                ...mono,
                fontSize: "0.67rem",
                background: "#0a1018",
                border: searchText ? "1px solid #ffd70044" : "1px solid #0e1f2e",
                color: "#8ab",
                padding: "2px 7px",
                borderRadius: 3,
                outline: "none",
                width: 130,
                marginLeft: 4,
              }}
            />
            <button
              type="button"
              onClick={handleEdit}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "1px solid #0e1f2e",
                borderRadius: 3,
                color: "#fb923c",
                cursor: "pointer",
                padding: "2px 7px",
                ...mono,
                fontSize: "0.67rem",
              }}
            >
              ✏️ edit & apply
            </button>
          </>
        )}

        {editing && (
          <>
            <span style={{ fontSize: "0.6rem", color: "#fb923c", ...mono }}>
              edit the YAML and apply, or cancel
            </span>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "1px solid #3a1a1a",
                borderRadius: 3,
                color: "#ff6b6b",
                cursor: "pointer",
                padding: "2px 7px",
                ...mono,
                fontSize: "0.67rem",
              }}
            >
              cancel
            </button>
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
                padding: "2px 7px",
                ...mono,
                fontSize: "0.67rem",
              }}
            >
              {applying ? "⏳ applying…" : "💾 save & apply"}
            </button>
          </>
        )}
      </div>

      {/* Result banner */}
      {result && (
        <div
          style={{
            padding: "6px 13px",
            fontSize: "0.72rem",
            ...mono,
            background: result.ok ? "#0a1a0a" : "#1a0a0a",
            borderBottom: "1px solid #0a1018",
            color: result.ok ? "#39ff8a" : "#ff6b6b",
            flexShrink: 0,
          }}
        >
          {result.ok ? "✅ Applied" : "❌ Error"}: {result.message}
        </div>
      )}

      {/* Search match counter */}
      {searchText && !editing && (
        <div
          style={{
            padding: "2px 13px",
            fontSize: "0.62rem",
            ...mono,
            color: "#ffd70088",
            background: "#0a0f18",
            borderBottom: "1px solid #0a1018",
            flexShrink: 0,
          }}
        >
          {lines.filter((l) => l.toLowerCase().includes(searchText.toLowerCase())).length} matches
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "10px 13px" }}>
        {fetching ? (
          <div style={{ color: "#39ff8a", ...mono, fontSize: "0.72rem", display: "flex", gap: 6 }}>
            <Spinner /> Loading…
          </div>
        ) : editing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              height: "100%",
              minHeight: 300,
              background: "#020408",
              border: "1px solid #0e1f2e",
              borderRadius: 4,
              color: "#bcc",
              ...mono,
              fontSize: "0.71rem",
              lineHeight: 1.7,
              padding: 10,
              resize: "none",
              outline: "none",
            }}
          />
        ) : (
          <pre style={{ margin: 0, ...mono, fontSize: "0.71rem", lineHeight: 1.9, display: "flex" }}>
            {/* Line numbers gutter */}
            <span style={{ userSelect: "none", color: "#0e1a2a", textAlign: "right", paddingRight: 14, minWidth: 36, flexShrink: 0 }}>
              {lines.map((_, i) => (
                <span key={i} style={{ display: "block" }}>{i + 1}</span>
              ))}
            </span>
            {/* Code content */}
            <span style={{ whiteSpace: "pre-wrap" }}>
              {lines.map((line, i) => (
                <span key={i} style={{ color: yaml?.error ? "#ff6b6b" : lineColor(line), display: "block" }}>
                  {highlightLine(line, i)}
                </span>
              ))}
            </span>
          </pre>
        )}
      </div>
    </div>
  );
}
