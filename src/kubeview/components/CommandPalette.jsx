import { mono } from "../theme";

export function CommandPalette({ open, query, setQuery, items, onClose, inputRef }) {
  if (!open) return null;

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
          width: "min(500px, 90vw)",
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
          <span style={{ color: "#39ff8a", fontSize: "0.85rem" }}>⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Open resource, switch cluster…"
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
        <div style={{ maxHeight: 260, overflowY: "auto" }}>
          {items.slice(0, 10).map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                item.fn();
                onClose();
              }}
              style={{
                display: "block",
                width: "100%",
                background: "none",
                border: "none",
                textAlign: "left",
                padding: "9px 14px",
                color: "#4a7a8a",
                ...mono,
                fontSize: "0.75rem",
                cursor: "pointer",
                borderBottom: "1px solid #080e18",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#0a1420";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
              }}
            >
              {item.label}
            </button>
          ))}
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
