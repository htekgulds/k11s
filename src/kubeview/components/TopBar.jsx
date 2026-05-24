import { mono, ENV_STYLE } from "../theme";

export function TopBar({ activeCluster, clusterState, onTabClick, onCloseTab, onOpenPalette, clock }) {
  const envStyle = ENV_STYLE[activeCluster?.env] || ENV_STYLE.dev;

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "0 12px",
          borderRight: "1px solid #080e18",
          height: "100%",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: activeCluster?.color,
            boxShadow: `0 0 6px ${activeCluster?.color}88`,
            animation: "pulse 2.5s infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ color: "#dde", ...mono, fontSize: "0.74rem", fontWeight: 700 }}>
          {activeCluster?.label}
        </span>
        <span
          style={{
            fontSize: "0.62rem",
            background: envStyle.bg,
            border: `1px solid ${envStyle.border}`,
            borderRadius: 3,
            color: envStyle.text,
            padding: "0 5px",
            ...mono,
          }}
        >
          {activeCluster?.env}
        </span>
      </div>
      <div style={{ display: "flex", flex: 1, overflow: "hidden", height: "100%", minWidth: 0 }}>
        {clusterState.tabs.map((tab) => {
          const isAct = clusterState.activeTab === tab.id;
          const isClusters = tab.id === "clusters";
          const isRes = tab.type === "resource";
          const isDet = tab.type === "detail";
          const tabErr = isDet && ["CrashLoopBackOff", "Error", "NotReady"].includes(tab.obj?.status);
          const resErr =
            isRes &&
            tab.hasErr;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabClick(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: isAct ? "#060a10" : "none",
                border: "none",
                borderBottom: isAct ? "2px solid #39ff8a" : "2px solid transparent",
                borderRight: "1px solid #080e18",
                color: isAct ? "#ccd" : tabErr || resErr ? "#ff5555" : "#2d4a6a",
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
              {isClusters && <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>⬡</span>}
              {(isRes || isDet) && <span style={{ fontSize: "0.68rem", opacity: 0.65 }}>{tab.icon}</span>}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{tab.label}</span>
              {(resErr || tabErr) && (
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
              {!isClusters && (
                <span
                  role="presentation"
                  onClick={(e) => onCloseTab(tab.id, e)}
                  style={{ color: "#0e1f2e", fontSize: "0.61rem", marginLeft: 1, flexShrink: 0, lineHeight: 1 }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    e.currentTarget.style.color = "#ff4d4d";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#0e1f2e";
                  }}
                >
                  ✕
                </span>
              )}
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
