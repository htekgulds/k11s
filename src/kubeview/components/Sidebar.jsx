import { RESOURCE_TYPES } from "../constants";
import { mono } from "../theme";

export function Sidebar({ clusterState, data, loading, onClustersClick, onOpenResource }) {
  return (
    <div
      style={{
        width: 152,
        background: "#030710",
        borderRight: "1px solid #080e18",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      <button
        type="button"
        onClick={onClustersClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          background:
            !clusterState.activeResource && !clusterState.activeTab ? "#080e18" : "none",
          border: "none",
          borderLeft:
            !clusterState.activeResource && !clusterState.activeTab
              ? "2px solid #39ff8a"
              : "2px solid transparent",
          color: !clusterState.activeResource && !clusterState.activeTab ? "#bdd" : "#1e3a52",
          padding: "8px 10px",
          cursor: "pointer",
          ...mono,
          fontSize: "0.72rem",
          width: "100%",
          textAlign: "left",
          borderBottom: "1px solid #080e18",
          marginBottom: 3,
        }}
      >
        <span style={{ fontSize: "0.8rem" }}>⬡</span> Clusters
      </button>
      <div
        style={{
          padding: "4px 10px 2px",
          color: "#0e1f2e",
          ...mono,
          fontSize: "0.57rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        Resources
      </div>
      {RESOURCE_TYPES.map((rt) => {
        const count = (data[rt.key] || []).length;
        const hasErr = (data[rt.key] || []).some((r) =>
          ["CrashLoopBackOff", "NotReady", "Error"].includes(r.status),
        );
        const isAct = clusterState.activeResource === rt.key && !clusterState.activeTab;
        const isOpen = clusterState.activeResource === rt.key;
        return (
          <button
            key={rt.key}
            type="button"
            onClick={() => onOpenResource(rt.key)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: isAct ? "#080e18" : "none",
              border: "none",
              borderLeft: isAct ? "2px solid #39ff8a" : isOpen ? "2px solid #1e3a52" : "2px solid transparent",
              color: isAct ? "#bdd" : isOpen ? "#4a7a8a" : "#2d4a6a",
              padding: "6px 9px 6px 10px",
              cursor: "pointer",
              ...mono,
              fontSize: "0.71rem",
              width: "100%",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              if (!isAct) e.currentTarget.style.background = "#060c14";
            }}
            onMouseLeave={(e) => {
              if (!isAct) e.currentTarget.style.background = "none";
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: "0.79rem", opacity: 0.7 }}>{rt.icon}</span>
              {rt.label}
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                color: hasErr ? "#ff4d4d" : isAct ? "#39ff8a" : isOpen ? "#2d4a6a" : "#0e1f2e",
              }}
            >
              {loading[rt.key] ? "…" : count || ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
