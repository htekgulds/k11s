import { Circle, Command, FileText } from "lucide-react";
import { mono } from "../../theme";

export function StatusBar({ activeCluster, connected, version, kubeconfigPaths, onAddCluster }) {
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
      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 2 }}>
        <FileText size={10} style={{ color: "#1e3a52" }} />
        <span style={{ color: "#1e3a52" }}>{kubeconfigPaths?.length || 0} kubeconfig</span>
        <button
          type="button"
          onClick={onAddCluster}
          style={{
            background: "none",
            border: "none",
            color: "#2d4a6a",
            cursor: "pointer",
            padding: "0 3px",
            fontSize: "0.62rem",
            ...mono,
          }}
          title="Add kubeconfig file"
        >
          +
        </button>
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}><Command size={10} />K palette · NPDSVICXL open resource tabs</span>
      <span>{version}</span>
    </div>
  );
}
