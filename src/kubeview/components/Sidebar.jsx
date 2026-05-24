import { RESOURCE_TYPES } from "../constants";
import { mono } from "../theme";

export function Sidebar({
  clusters,
  activeClusterId,
  clusterState,
  clusterData,
  clusterLoading,
  data,
  loading,
  onClustersClick,
  onSwitchCluster,
  onOpenResource,
}) {
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
          background: clusterState.activeTab === "clusters" ? "#080e18" : "none",
          border: "none",
          borderLeft:
            clusterState.activeTab === "clusters" ? "2px solid #39ff8a" : "2px solid transparent",
          color: clusterState.activeTab === "clusters" ? "#bdd" : "#1e3a52",
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
        <span style={{ marginLeft: "auto", fontSize: "0.62rem", color: "#1e3a52" }}>{clusters.length}</span>
      </button>
      <div style={{ padding: "4px 0", borderBottom: "1px solid #080e18", marginBottom: 3 }}>
        {clusters.map((cl) => (
          <button
            key={cl.id}
            type="button"
            onClick={() => onSwitchCluster(cl.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              background: cl.id === activeClusterId ? "#080e18" : "none",
              border: "none",
              borderLeft:
                cl.id === activeClusterId ? `2px solid ${cl.color}` : "2px solid transparent",
              color: cl.id === activeClusterId ? "#aab" : "#1e3a52",
              padding: "4px 10px",
              cursor: "pointer",
              ...mono,
              fontSize: "0.67rem",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              if (cl.id !== activeClusterId) e.currentTarget.style.background = "#060c14";
            }}
            onMouseLeave={(e) => {
              if (cl.id !== activeClusterId) e.currentTarget.style.background = "none";
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: cl.color, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {cl.label}
            </span>
            {(clusterData[cl.id]?.pods || []).some((p) =>
              ["CrashLoopBackOff", "Error"].includes(p.status),
            ) && (
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "#ff4d4d",
                  animation: "pulse 1s infinite",
                  flexShrink: 0,
                }}
              />
            )}
          </button>
        ))}
      </div>
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
        const tabId = `res·${rt.key}`;
        const isOpen = clusterState.tabs.some((t) => t.id === tabId);
        const isAct = clusterState.activeTab === tabId;
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
      <div style={{ marginTop: "auto", padding: "10px", borderTop: "1px solid #080e18" }}>
        <div
          style={{
            fontSize: "0.57rem",
            color: "#0e1f2e",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            ...mono,
            marginBottom: 7,
          }}
        >
          All Clusters
        </div>
        {clusters.map((cl) => {
          const pods = clusterData[cl.id]?.pods || [];
          const ok = pods.filter((p) => p.status === "Running").length;
          const t = pods.length;
          const hasErr = pods.some((p) => ["CrashLoopBackOff", "Error"].includes(p.status));
          return (
            <button
              key={cl.id}
              type="button"
              onClick={() => onSwitchCluster(cl.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                width: "100%",
                background: "none",
                border: "none",
                padding: "3px 0",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: cl.color, flexShrink: 0 }} />
              <span
                style={{
                  fontSize: "0.62rem",
                  color: cl.id === activeClusterId ? "#aab" : "#2d4a6a",
                  ...mono,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {cl.label}
              </span>
              {t > 0 && (
                <span
                  style={{
                    fontSize: "0.59rem",
                    color: hasErr ? "#ff4d4d" : ok === t ? "#39ff8a" : "#f5c518",
                    ...mono,
                  }}
                >
                  {ok}/{t}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
