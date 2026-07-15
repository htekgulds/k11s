import { mono } from "../../theme";

export function DropZoneOverlay({ isDragging }) {
  if (!isDragging) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.82)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div
        style={{
          border: "2px dashed #39ff8a",
          borderRadius: 12,
          padding: "48px 64px",
          textAlign: "center",
          ...mono,
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: 12, color: "#39ff8a" }}>
          📄
        </div>
        <div style={{ fontSize: "1.1rem", color: "#bdd", marginBottom: 8 }}>
          Drop YAML file here
        </div>
        <div style={{ fontSize: "0.75rem", color: "#4a7a8a" }}>
          .yaml or .yml — will be applied to the active cluster
        </div>
      </div>
    </div>
  );
}
