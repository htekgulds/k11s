import { useState } from "react";
import { applyYaml } from "../../api";
import { cn } from "../../utils/cn";
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
      className={cn(
        "fixed inset-0 z-[2500] flex items-center justify-center",
        "bg-black/82 animate-[fadeIn_0.13s_ease]"
      )}
      onClick={handleClose}
    >
      <div
        className={cn(
          "w-[min(720px,92vw)] max-h-[85vh] flex flex-col overflow-hidden",
          "bg-[#0a0f18] border border-[#0e1f2e] rounded-lg",
          "shadow-[0_24px_64px_rgba(0,0,0,0.95)]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          "px-[14px] py-[10px] border-b border-[#0a1420]",
          "flex items-center gap-[9px] flex-shrink-0"
        )}>
          <span className={cn("text-[0.71rem] text-[#39ff8a] font-mono")}>
            📄 {fileName || "YAML preview"}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className={cn(
              "ml-auto px-[8px] py-[2px] rounded text-[0.67rem] font-mono cursor-pointer",
              "bg-transparent border border-[#1a1a2e] text-[#4a7a8a]",
              "hover:bg-[#0a1420] hover:border-[#1a3a4a] hover:text-[#7dd3fc]"
            )}
          >
            ✕ close
          </button>
        </div>

        {/* YAML content */}
        <div className="flex-1 overflow-auto p-[10px_14px] min-h-[200px]">
          <pre className={cn(
            "m-0 font-mono text-[0.71rem] leading-[1.9] whitespace-pre-wrap",
            "bg-[#020408] border border-[#0e1f2e] rounded p-[10px]"
          )}>
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
                <span key={i} className="block" style={{ color: c }}>
                  {line}
                </span>
              );
            })}
          </pre>
        </div>

        {/* Namespace override + Apply */}
        <div className={cn(
          "px-[14px] py-[10px] border-t border-[#0a1420]",
          "flex items-center gap-[10px] flex-shrink-0 flex-wrap"
        )}>
          {/* Namespace selector */}
          <div className="flex items-center gap-[6px]">
            <span className={cn("text-[0.65rem] text-[#4a7a8a] font-mono")}>
              Namespace:
            </span>
            {!useCustomNs ? (
              <select
                value={namespace}
                onChange={(e) => setNamespace(e.target.value)}
                className={cn(
                  "px-[6px] py-[2px] rounded text-[0.68rem] font-mono outline-none cursor-pointer",
                  "bg-[#080e18] border border-[#0e1f2e] text-[#7dd3fc] max-w-[160px]"
                )}
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
                className={cn(
                  "px-[6px] py-[2px] rounded text-[0.68rem] font-mono outline-none w-[140px]",
                  "bg-[#080e18] border border-[#0e1f2e] text-[#7dd3fc]"
                )}
              />
            )}
            <button
              type="button"
              onClick={() => { setUseCustomNs((p) => !p); setNamespace(""); setNamespaceInput(""); }}
              className={cn(
                "text-[0.6rem] font-mono cursor-pointer underline",
                "bg-transparent border-none text-[#4a7a8a]",
                "hover:text-[#7dd3fc]"
              )}
            >
              {useCustomNs ? "pick" : "custom"}
            </button>
          </div>

          <div className="flex-1" />

          {/* Result message */}
          {result && (
            <span className={cn(
              "text-[0.68rem] font-mono max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap",
              result.ok ? "text-[#39ff8a]" : "text-[#ff6b6b]"
            )}>
              {result.ok ? "✅ " : "❌ "}{result.message}
            </span>
          )}

          {/* Apply button */}
          <button
            type="button"
            onClick={handleApply}
            disabled={applying}
            className={cn(
              "px-[14px] py-[4px] rounded text-[0.7rem] font-mono",
              "flex items-center gap-[6px] transition-colors",
              applying
                ? "bg-[#0a1a0a] border border-[#1a3a1a] text-[#1e3a52] cursor-not-allowed"
                : "bg-transparent border border-[#1a3a1a] text-[#39ff8a] hover:bg-[#0a1a0a] hover:border-[#39ff8a] cursor-pointer"
            )}
          >
            {applying && <Spinner />}
            {applying ? "applying…" : "▶ apply"}
          </button>
        </div>
      </div>
    </div>
  );
}