import { STATUS_COLOR, mono } from "../../theme";

export function StatusDot({ status }) {
  const c = STATUS_COLOR[status] || "#556";
  const pulse = status === "Running" || status === "Ready" || status === "Bound";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: c,
          boxShadow: `0 0 5px ${c}55`,
          flexShrink: 0,
          animation: pulse ? "pulse 2.5s infinite" : "none",
        }}
      />
      <span style={{ color: c, ...mono, fontSize: "0.77rem", fontWeight: 700 }}>{status || "—"}</span>
    </span>
  );
}
