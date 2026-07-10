import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ENV_STYLE, mono } from "../../theme";

export function ClusterDropdown({ clusters, activeCluster, onSwitch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const envStyle = ENV_STYLE[activeCluster?.env] || ENV_STYLE.dev;

  useHotkeys("escape", () => setOpen(false), { enabled: open }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!activeCluster) return null;

  return (
    <div ref={ref} style={{ position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          height: "100%",
          padding: "0 12px",
          background: open ? "#080e18" : "none",
          border: "none",
          borderRight: "1px solid #080e18",
          cursor: "pointer",
          ...mono,
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = "#060c14";
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "none";
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: activeCluster.color,
            boxShadow: `0 0 6px ${activeCluster.color}88`,
            animation: "pulse 2.5s infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ color: "#dde", fontSize: "0.74rem", fontWeight: 700 }}>{activeCluster.label}</span>
        <span
          style={{
            fontSize: "0.62rem",
            background: envStyle.bg,
            border: `1px solid ${envStyle.border}`,
            borderRadius: 3,
            color: envStyle.text,
            padding: "0 5px",
          }}
        >
          {activeCluster.env}
        </span>
        <span style={{ color: "#2d4a6a", fontSize: "1rem", marginLeft: 2 }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            minWidth: 220,
            background: "#0a0f18",
            border: "1px solid #0e1f2e",
            borderRadius: 6,
            boxShadow: "0 12px 32px rgba(0,0,0,0.85)",
            zIndex: 1000,
            overflow: "hidden",
            animation: "fadeIn 0.1s ease",
          }}
        >
          <div
            style={{
              padding: "6px 10px",
              fontSize: "0.57rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#1e3a52",
              borderBottom: "1px solid #080e18",
              ...mono,
            }}
          >
            Switch cluster
          </div>
          {clusters.map((cl) => {
            const es = ENV_STYLE[cl.env] || ENV_STYLE.dev;
            const isActive = cl.id === activeCluster.id;
            return (
              <button
                key={cl.id}
                type="button"
                onClick={() => {
                  onSwitch(cl.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 10px",
                  background: isActive ? "#080e18" : "none",
                  border: "none",
                  borderLeft: isActive ? `2px solid ${cl.color}` : "2px solid transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  ...mono,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = "#060c14";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "none";
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: cl.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: "0.72rem",
                    color: isActive ? "#dde" : "#7a9aaa",
                    fontWeight: isActive ? 700 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cl.label}
                </span>
                <span
                  style={{
                    fontSize: "0.58rem",
                    background: es.bg,
                    border: `1px solid ${es.border}`,
                    borderRadius: 3,
                    color: es.text,
                    padding: "0 4px",
                    flexShrink: 0,
                  }}
                >
                  {cl.env}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
