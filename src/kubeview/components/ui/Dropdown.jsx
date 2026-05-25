import { useState, useRef, useEffect } from "react";
import { mono } from "../../theme";

export function Dropdown({ value, options, onChange, style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          background: "#080e18",
          border: "1px solid #0e1f2e",
          borderRadius: 3,
          color: "#7dd3fc",
          padding: "2px 20px 2px 6px",
          ...mono,
          fontSize: "0.68rem",
          outline: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
          whiteSpace: "nowrap",
          position: "relative",
          width: "100%",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{value}</span>
        <span style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", fontSize: "1rem", color: "#1e3a52" }}>
          ▾
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 100,
            background: "#0a1420",
            border: "1px solid #0e1f2e",
            borderRadius: 3,
            marginTop: 2,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: opt === value ? "#0e1f2e" : "transparent",
                border: "none",
                color: opt === value ? "#7dd3fc" : "#3a5878",
                padding: "3px 6px",
                ...mono,
                fontSize: "0.68rem",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { if (opt !== value) e.currentTarget.style.background = "#0a1828"; }}
              onMouseLeave={(e) => { if (opt !== value) e.currentTarget.style.background = "transparent"; }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
