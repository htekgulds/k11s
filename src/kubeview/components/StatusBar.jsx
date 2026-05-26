import { Circle, Command } from "lucide-react";
import { mono } from "../theme";

export function StatusBar({ activeCluster, connected, version }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 12px",
        height: 22,
        background: "#030710",
        borderTop: "1px solid #080e18",
        flexShrink: 0,
        ...mono,
        fontSize: "0.62rem",
        color: "#0e1f2e",
      }}
    >
      <span style={{ color: connected ? "#39ff8a" : "#ff4d4d", display: "inline-flex", alignItems: "center", gap: 4, animation: connected ? "pulse 2.5s infinite" : "none" }}>
        <Circle size={10} fill="currentColor" /> {connected ? "CONNECTED" : "DISCONNECTED"}
      </span>
      <span style={{ color: activeCluster?.color }}>{activeCluster?.label}</span>
      <span>{activeCluster?.context}</span>
      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 2 }}><Command size={10} />K palette · NPDSVICXL open resource tabs</span>
      <span>{version}</span>
    </div>
  );
}
