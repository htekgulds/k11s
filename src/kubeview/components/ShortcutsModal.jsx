import { X } from "lucide-react";
import { COMMON_RESOURCES } from "../constants";
import { mono } from "../theme";

const shortcuts = [
  { key: "?", desc: "Toggle this shortcuts panel" },
  { key: "Cmd+K / :", desc: "Open command palette" },
  { key: "Esc", desc: "Close command palette / modals" },
  { key: "Cmd+W", desc: "Close active tab" },
  ...COMMON_RESOURCES.map((r) => ({ key: r.shortcut, desc: `Open ${r.label} list` })),
];

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "4px 0",
  fontSize: "0.72rem",
  ...mono,
};

const kbdStyle = {
  background: "#080e18",
  border: "1px solid #1e3a52",
  borderRadius: 3,
  padding: "1px 6px",
  fontSize: "0.65rem",
  color: "#bdd",
  ...mono,
};

export function ShortcutsModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0a1420",
          border: "1px solid #0e1f2e",
          borderRadius: 8,
          padding: 20,
          minWidth: 320,
          maxWidth: 420,
          ...mono,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <span style={{ color: "#bdd", fontWeight: 700, fontSize: "0.85rem" }}>
            Keyboard Shortcuts
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#4a7a8a",
              cursor: "pointer",
              padding: 4,
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {shortcuts.map((s) => (
            <div key={s.key} style={rowStyle}>
              <span style={{ color: "#889" }}>{s.desc}</span>
              <span style={kbdStyle}>{s.key}</span>
            </div>
          ))}
        </div>

        <div style={{ color: "#2d4a6a", fontSize: "0.62rem", marginTop: 12, textAlign: "center" }}>
          Press <span style={kbdStyle}>?</span> or <span style={kbdStyle}>Cmd+/</span> to toggle
        </div>
      </div>
    </div>
  );
}
