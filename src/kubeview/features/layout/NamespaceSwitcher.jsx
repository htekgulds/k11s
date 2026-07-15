import { useState, useEffect, useRef, useMemo } from "react";
import { Globe } from "lucide-react";
import { mono } from "../../theme";
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

export function NamespaceSwitcher({
  activeNamespace,
  onNamespaceChange,
  data,
}) {
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

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "none",
          border: "none",
          borderRight: "1px solid #080e18",
          color: display === "All" ? "#1e3a52" : "#7dd3fc",
          padding: "0 10px",
          height: "100%",
          cursor: "pointer",
          ...mono,
          fontSize: "0.7rem",
          whiteSpace: "nowrap",
          transition: "all 0.08s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "#060c14"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
        title={`Current namespace: ${display} (${nsCount} total)`}
      >
        <Globe size={12} style={{ color: "#39ff8a", opacity: 0.7 }} />
        <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}>
          {display}
        </span>
        <span style={{ fontSize: "0.55rem", color: "#0e1f2e" }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            zIndex: 200,
            marginTop: 2,
            background: "#0a1420",
            border: "1px solid #152238",
            borderRadius: 5,
            minWidth: 180,
            maxHeight: 280,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {/* Filter input */}
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #0e1f2e" }}>
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter namespaces…"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#080e18",
                border: "1px solid #0e1f2e",
                borderRadius: 3,
                color: "#bcc",
                padding: "4px 8px",
                ...mono,
                fontSize: "0.68rem",
                outline: "none",
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setOpen(false); setFilter(""); }
                if (e.key === "Enter" && filtered.length > 0) { handleSelect(filtered[0]); }
              }}
            />
          </div>

          {/* Namespace list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "2px 0" }}>
            {filtered.map((ns) => {
              const isActive = ns === activeNamespace || (ns === "All" && !activeNamespace);
              return (
                <button
                  key={ns}
                  type="button"
                  onClick={() => handleSelect(ns)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    textAlign: "left",
                    background: isActive ? "#0e1f2e" : "transparent",
                    border: "none",
                    color: ns === "All" ? "#1e3a52" : nsColor(ns),
                    padding: "5px 12px",
                    cursor: "pointer",
                    ...mono,
                    fontSize: "0.72rem",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#0a1828"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  {ns === "All" ? (
                    <span style={{ color: "#4a7a8a", fontSize: "0.62rem" }}>🌐</span>
                  ) : (
                    <span style={{
                      display: "inline-block",
                      width: 6, height: 6,
                      borderRadius: "50%",
                      background: nsColor(ns),
                      flexShrink: 0,
                      opacity: isActive ? 1 : 0.4,
                    }} />
                  )}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ns}
                  </span>
                  {isActive && (
                    <span style={{ color: "#39ff8a", fontSize: "0.62rem" }}>✓</span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: "16px", textAlign: "center", color: "#1e3a52", ...mono, fontSize: "0.68rem" }}>
                No namespaces match "{filter}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
