import { mono } from "../theme";
import { ClusterDropdown } from "./ClusterDropdown";

export function TopBar({
  clusters,
  activeCluster,
  onSwitchCluster,
  clusterState,
  onTabClick,
  onCloseTab,
  onOpenPalette,
  clock,
}) {
  const detailTabs = clusterState.tabs.filter((t) => t.type === "detail");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 38,
        background: "#030710",
        borderBottom: "1px solid #080e18",
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: 142,
          paddingLeft: 12,
          borderRight: "1px solid #080e18",
          height: "100%",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            color: "#39ff8a",
            letterSpacing: "0.15em",
          }}
        >
          ⬡ k11s
        </span>
      </div>
      <ClusterDropdown
        clusters={clusters}
        activeCluster={activeCluster}
        onSwitch={onSwitchCluster}
      />
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%", minWidth: 0 }}>
        {detailTabs.map((tab) => {
          const isAct = clusterState.activeTab === tab.id;
          const tabErr = tab.tabErr;
          const tabColor = tab.color || "#39ff8a";

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabClick(tab.id)}
              onMouseDown={(e) => { if (e.button === 1) onCloseTab(tab.id, e); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: isAct ? "#060a10" : "none",
                border: "none",
                borderBottom: isAct ? `2px solid ${tabColor}` : "2px solid transparent",
                borderLeft: 'none',
                borderRight: "1px solid #080e18",
                color: isAct ? "#ccd" : tabErr ? "#ff5555" : "#2d4a6a",
                padding: "0 12px",
                height: "100%",
                cursor: "pointer",
                ...mono,
                fontSize: "0.7rem",
                whiteSpace: "nowrap",
                flexShrink: 0,
                maxWidth: 180,
                transition: "all 0.08s",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: tabColor,
                  flexShrink: 0,
                  opacity: isAct ? 1 : 0.65,
                }}
              />
              <span style={{ fontSize: "0.68rem", opacity: 0.65 }}>{tab.icon}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{tab.label}</span>
              {tabErr && (
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
              <span
                role="presentation"
                onClick={(e) => onCloseTab(tab.id, e)}
                style={{ color: "#0e1f2e", fontSize: "0.85rem", marginLeft: 4, flexShrink: 0, lineHeight: 1, borderRadius: 3, padding: "0 3px", transition: "all 0.08s" }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  e.currentTarget.style.color = "#ff4d4d";
                  e.currentTarget.style.background = "rgba(255,77,77,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#0e1f2e";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                ✕
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 12, flexShrink: 0 }}>
        <button
          type="button"
          onClick={onOpenPalette}
          style={{
            background: "#0a1018",
            border: "1px solid #0e1f2e",
            borderRadius: 3,
            color: "#1e3a52",
            padding: "2px 8px",
            cursor: "pointer",
            ...mono,
            fontSize: "0.67rem",
          }}
        >
          ⌘K
        </button>
        <span style={{ color: "#0e1f2e", ...mono, fontSize: "0.67rem" }}>{clock.toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
