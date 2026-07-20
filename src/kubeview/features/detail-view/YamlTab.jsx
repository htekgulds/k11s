import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyYaml, k8sInvoke } from "../../api";
import { exportContent } from "../../api/export";
import { cn } from "../../utils/cn";
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
            ? <span key={j} className="bg-[#ffd70033] text-[#ffd700] rounded px-[1px]">{p}</span>
            : <span key={j}>{p}</span>
        )}
      </span>
    );
  };

  // Syntax color for YAML keys
  const lineColor = (line) => {
    const ind = line.match(/^(\s*)/)?.[1]?.length ?? 0;
    if (line.trim().startsWith("#")) return "text-[#1e3a52]";
    if (ind === 0 && /\w+:/.test(line)) return "text-[#7dd3fc]";
    if (ind <= 2 && /\w+:/.test(line)) return "text-[#c4b5fd]";
    if (/\w+:/.test(line)) return "text-[#a5f3fc]";
    if (/^(\s*)-/.test(line)) return "text-[#86efac]";
    return "text-[#fde68a]";
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className={cn(
        "flex items-center gap-2 px-[13px] py-[5px] border-b border-[#0a1018]",
        "bg-[#050910] flex-shrink-0 flex-wrap"
      )}>
        <span className={cn(
          "font-mono text-[0.59rem] uppercase tracking-[0.1em] text-[#1e3a52]"
        )}>
          {editing ? "editing" : "manifest"}
        </span>

        {!editing && (
          <>
            <button
              type="button"
              onClick={() => setHideMF((p) => !p)}
              className={cn(
                "px-2 py-0.5 rounded border text-[0.67rem] font-mono cursor-pointer",
                "bg-transparent border-[#0e1f2e]",
                hideMF ? "text-[#1e3a52]" : "text-[#7dd3fc]",
                "hover:bg-[#0a1420]"
              )}
            >
              {hideMF ? "show managed fields" : "hide managed fields"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "px-2 py-0.5 rounded border text-[0.67rem] font-mono cursor-pointer",
                "bg-transparent border-[#0e1f2e]",
                copied ? "text-[#39ff8a]" : "text-[#4a7a8a]",
                "hover:bg-[#0a1420]"
              )}
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
              className={cn(
                "px-2 py-0.5 rounded border text-[0.67rem] font-mono cursor-pointer",
                "bg-transparent border-[#0e1f2e] text-[#4a7a8a]",
                "hover:bg-[#0a1420]"
              )}
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
              className={cn(
                "font-mono text-[0.67rem] w-32 px-2 py-0.5 rounded border outline-none",
                "bg-[#0a1018] text-[#8ab]",
                searchText ? "border-[#ffd70044]" : "border-[#0e1f2e]"
              )}
            />
            <button
              type="button"
              onClick={handleEdit}
              className={cn(
                "ml-auto px-2 py-0.5 rounded border text-[0.67rem] font-mono cursor-pointer",
                "bg-transparent border-[#0e1f2e] text-[#fb923c]",
                "hover:bg-[#0a1420]"
              )}
            >
              ✏️ edit & apply
            </button>
          </>
        )}

        {editing && (
          <>
            <span className={cn("font-mono text-[0.6rem] text-[#fb923c]")}>
              edit the YAML and apply, or cancel
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className={cn(
                "ml-auto px-2 py-0.5 rounded border text-[0.67rem] font-mono cursor-pointer",
                "bg-transparent border-[#3a1a1a] text-[#ff6b6b]",
                "hover:bg-[#1a0a0a]"
              )}
            >
              cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying}
              className={cn(
                "px-2 py-0.5 rounded border text-[0.67rem] font-mono cursor-pointer",
                applying
                  ? "bg-[#0a1a0a] border-[#1a3a1a] text-[#1e3a52] cursor-not-allowed"
                  : "bg-transparent border-[#1a3a1a] text-[#39ff8a] hover:bg-[#0a1a0a]"
              )}
            >
              {applying ? "⏳ applying…" : "💾 save & apply"}
            </button>
          </>
        )}
      </div>

      {/* Result banner */}
      {result && (
        <div className={cn(
          "px-[13px] py-[6px] font-mono text-[0.72rem] border-b border-[#0a1018] flex-shrink-0",
          result.ok
            ? "bg-[#0a1a0a] text-[#39ff8a]"
            : "bg-[#1a0a0a] text-[#ff6b6b]"
        )}>
          {result.ok ? "✅ Applied" : "❌ Error"}: {result.message}
        </div>
      )}

      {/* Search match counter */}
      {searchText && !editing && (
        <div className={cn(
          "px-[13px] py-[2px] font-mono text-[0.62rem] border-b border-[#0a1018] flex-shrink-0",
          "text-[#ffd70088] bg-[#0a0f18]"
        )}>
          {lines.filter((l) => l.toLowerCase().includes(searchText.toLowerCase())).length} matches
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-auto p-[10px_13px]">
        {fetching ? (
          <div className={cn("flex items-center gap-2 font-mono text-[0.72rem]", "text-[#39ff8a]")}>
            <Spinner /> Loading…
          </div>
        ) : editing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            spellCheck={false}
            className={cn(
              "w-full h-full min-h-[300px] font-mono text-[0.71rem] leading-[1.7] p-2.5",
              "bg-[#020408] border border-[#0e1f2e] rounded text-[#bcc]",
              "resize-none outline-none"
            )}
          />
        ) : (
          <pre className={cn("m-0 font-mono text-[0.71rem] leading-[1.9] flex")}>
            {/* Line numbers gutter */}
            <span className={cn(
              "select-none text-right pr-[14px] min-w-[36px] flex-shrink-0",
              "text-[#0e1a2a]"
            )}>
              {lines.map((_, i) => (
                <span key={i} className="block">{i + 1}</span>
              ))}
            </span>
            {/* Code content */}
            <span className="whitespace-pre-wrap">
              {lines.map((line, i) => (
                <span
                  key={i}
                  className={cn(
                    "block",
                    yaml?.error ? "text-[#ff6b6b]" : lineColor(line)
                  )}
                >
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