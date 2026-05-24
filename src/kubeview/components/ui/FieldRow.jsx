import { mono } from "../../theme";

export function FieldRow({ label, children, wide }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        paddingBottom: 12,
        borderBottom: "1px solid #0a1018",
        gridColumn: wide ? "1/-1" : "auto",
      }}
    >
      <span
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#1e3a52",
          ...mono,
        }}
      >
        {label}
      </span>
      <div style={{ fontSize: "0.77rem", color: "#bdd", ...mono }}>{children}</div>
    </div>
  );
}
