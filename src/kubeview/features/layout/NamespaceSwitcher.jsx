import { useState, useEffect, useRef, useMemo } from "react";
import { Globe } from "lucide-react";
import { cn } from "../../utils/cn";
import { nsColor } from "../../utils/colors";

function computeAllNamespaces(data) {
  const set = new Set();
  set.add("All");
  for (const key of Object.keys(data)) {
    const arr = data[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (item.namespace) set.add(item.namespace);
    }
  }
  return [...set].sort((a, b) => {
    if (a === "All") return -1;
    if (b === "All") return 1;
    return a.localeCompare(b);
  });
}

export function NamespaceSwitcher({ activeNamespace, onNamespaceChange, data }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const allNs = useMemo(() => computeAllNamespaces(data), [data]);

  const filtered = useMemo(() => {
    if (!filter) return allNs;
    const q = filter.toLowerCase();
    return allNs.filter((ns) => ns.toLowerCase().includes(q));
  }, [allNs, filter]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setFilter("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (ns) => {
    onNamespaceChange(ns);
    setOpen(false);
    setFilter("");
  };

  const display = activeNamespace || "All";
  const nsCount = allNs.length - 1; // exclude "All"

  const displayColor = display === "All" ? "text-[#1e3a52]" : "text-[#7dd3fc]";

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-[5px] h-full px-[10px] border-r border-[#080e18]",
          "cursor-pointer font-mono text-[0.7rem] whitespace-nowrap transition-colors",
          displayColor,
          "hover:bg-[#060c14]"
        )}
        title={`Current namespace: ${display} (${nsCount} total)`}
      >
        <Globe size={12} className="text-[#39ff8a] opacity-70" />
        <span className="max-w-[100px] overflow-hidden text-ellipsis">
          {display}
        </span>
        <span className="text-[0.55rem] text-[#0e1f2e]">▾</span>
      </button>

      {open && (
        <div className={cn(
          "absolute top-full left-0 z-[200] mt-1 min-w-[180px] max-h-[280px]",
          "bg-[#0a1420] border border-[#152238] rounded-lg",
          "shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col"
        )}>
          {/* Filter input */}
          <div className="px-[8px] py-[6px] border-b border-[#0e1f2e]">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter namespaces…"
              className={cn(
                "w-full box-border px-[8px] py-[4px] rounded text-[0.68rem] font-mono outline-none",
                "bg-[#080e18] border border-[#0e1f2e] text-[#bcc]",
                "focus:border-[#39ff8a]"
              )}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setOpen(false); setFilter(""); }
                if (e.key === "Enter" && filtered.length > 0) { handleSelect(filtered[0]); }
              }}
            />
          </div>

          {/* Namespace list */}
          <div className="flex-1 overflow-y-auto py-[2px]">
            {filtered.map((ns) => {
              const isActive = ns === activeNamespace || (ns === "All" && !activeNamespace);
              const nsCol = ns === "All" ? "text-[#1e3a52]" : `text-[${nsColor(ns)}]`;
              return (
                <button
                  key={ns}
                  type="button"
                  onClick={() => handleSelect(ns)}
                  className={cn(
                    "flex items-center gap-[8px] w-full text-left px-[12px] py-[5px]",
                    "font-mono text-[0.72rem] cursor-pointer transition-colors",
                    isActive ? "bg-[#0e1f2e]" : "bg-transparent hover:bg-[#0a1828]",
                    nsCol
                  )}
                >
                  {ns === "All" ? (
                    <span className="text-[0.62rem] text-[#4a7a8a]">🌐</span>
                  ) : (
                    <span
                      className={cn(
                        "w-[6px] h-[6px] rounded-full flex-shrink-0",
                        isActive ? "opacity-100" : "opacity-40"
                      )}
                      style={{ background: nsColor(ns) }}
                    />
                  )}
                  <span className="truncate flex-1">{ns}</span>
                  {isActive && (
                    <span className="text-[0.62rem] text-[#39ff8a]">✓</span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className={cn(
                "px-[16px] py-[16px] text-center font-mono text-[0.68rem]",
                "text-[#1e3a52]"
              )}>
                No namespaces match "{filter}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}