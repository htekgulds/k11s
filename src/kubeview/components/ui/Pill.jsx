import { mono } from "../../theme";

export function Pill({ label, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 7px",
        borderRadius: 3,
        background: `${color}14`,
        border: `1px solid ${color}40`,
        color,
        fontSize: "0.68rem",
        ...mono,
        fontWeight: 700,
        letterSpacing: "0.03em",
      }}
    >
      {label}
    </span>
  );
}
