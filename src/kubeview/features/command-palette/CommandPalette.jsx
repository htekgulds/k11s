import { useCallback, useEffect, useRef, useState } from "react";
import { Command } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { mono } from "../../theme";

export function CommandPalette({ open, query, setQuery, items, onClose, inputRef }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const visible = items.filter((i) => !i.separator).slice(0, 10);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) setSelectedIndex(0);
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useHotkeys("down", () => setSelectedIndex((i) => Math.min(i + 1, visible.length - 1)), { enableOnFormTags: true, enabled: open, preventDefault: true }, [visible.length, open]);
  useHotkeys("up", () => setSelectedIndex((i) => Math.max(i - 1, 0)), { enableOnFormTags: true, enabled: open, preventDefault: true }, [open]);
  useHotkeys("enter", () => {
    const item = visible[selectedIndex];
    if (item) { item.fn(); onClose(); }
  }, { enableOnFormTags: true, enabled: open }, [visible, selectedIndex, onClose, open]);

  const runItem = useCallback((item) => {
    item.fn();
    onClose();
  }, [onClose]);

  if (!open) return null;

  let renderIdx = 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "13vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0a0f18",
          border: "1px solid #0e1f2e",
          borderRadius: 8,
          width: "min(520px, 90vw)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.95)",
          animation: "fadeIn 0.13s ease",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid #0a1420",
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <Command size={16} style={{ color: "#39ff8a" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search resources, open resource view, switch cluster…"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "#dde",
              ...mono,
              fontSize: "0.82rem",
            }}
          />
          <span style={{ color: "#0e1f2e", fontSize: "0.67rem" }}>ESC</span>
        </div>
        <div ref={listRef} style={{ maxHeight: 320, overflowY: "auto" }}>
          {items.map((item, i) => {
            if (item.separator) {
              return (
                <div
                  key={`sep-${i}`}
                  style={{
                    height: 1,
                    background: "#0e1f2e",
                    margin: "4px 14px",
                  }}
                />
              );
            }
            const idx = renderIdx++;
            return (
              <button
                key={i}
                type="button"
                onClick={() => runItem(item)}
                style={{
                  display: "block",
                  width: "100%",
                  background: selectedIndex === idx ? "#0a1420" : "none",
                  border: "none",
                  textAlign: "left",
                  padding: "9px 14px",
                  color: selectedIndex === idx ? "#c8d6e5" : "#4a7a8a",
                  ...mono,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  borderBottom: "1px solid #080e18",
                }}
                onMouseEnter={(e) => {
                  setSelectedIndex(idx);
                  e.currentTarget.style.background = "#0a1420";
                }}
                onMouseLeave={(e) => {
                  if (selectedIndex !== idx) e.currentTarget.style.background = "none";
                }}
              >
                {item.label}
              </button>
            );
          })}
          {!items.length && (
            <div style={{ padding: "18px 14px", color: "#0e1f2e", ...mono, fontSize: "0.72rem" }}>
              No match
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
