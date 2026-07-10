import { Hexagon, AlertTriangle, Plus, FileInput } from "lucide-react";
import { RESOURCE_TYPES } from "../constants";
import { ENV_STYLE, PROVIDER_ICON, mono } from "../theme";
import { useState } from "react";

export function ClustersTab({
  clusters,
  activeClusterId,
  allClusterData,
  kubeconfigPaths,
  onSwitch,
  onOpenResource,
  onAddCluster,
  onRemoveKubeconfigPath,
  onAddKubeconfigByPath,
}) {
  const [manualPath, setManualPath] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const handleSubmitManualPath = async () => {
    const trimmed = manualPath.trim();
    if (!trimmed) return;
    try {
      await onAddKubeconfigByPath(trimmed);
      setManualPath("");
      setShowManualInput(false);
    } catch (e) {
      console.error("Failed to add kubeconfig path:", e);
    }
  };
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "1.1rem",
            color: "#39ff8a",
            letterSpacing: "0.1em",
          }}
        >
          <Hexagon size={20} style={{ verticalAlign: "middle", marginRight: 4 }} /> Clusters
        </span>
        <span style={{ fontSize: "0.67rem", color: "#1e3a52", ...mono }}>
          {clusters.length} registered
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 14,
        }}
      >
        {clusters.map((cl) => {
          const clusterData = allClusterData[cl.id] || {};
          const pods = clusterData.pods || [];
          const nodes = clusterData.nodes || [];
          const deps = clusterData.deployments || [];
          const runningPods = pods.filter((p) => p.status === "Running").length;
          const readyNodes = nodes.filter((n) => n.status === "Ready").length;
          const failingPods = pods.filter((p) =>
            ["CrashLoopBackOff", "Error", "OOMKilled"].includes(p.status),
          );
          const isActive = cl.id === activeClusterId;
          const es = ENV_STYLE[cl.env] || ENV_STYLE.dev;

          return (
            <div
              key={cl.id}
              style={{
                background: isActive ? "#0a1420" : "#060c14",
                border: `1px solid ${isActive ? `${cl.color}44` : "#0a1420"}`,
                borderRadius: 8,
                overflow: "hidden",
                transition: "all 0.12s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.borderColor = "#0e1f2e";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.borderColor = "#0a1420";
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid #0a1018",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
                onClick={() => onSwitch(cl.id)}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: cl.color,
                    boxShadow: `0 0 7px ${cl.color}88`,
                    flexShrink: 0,
                    animation: isActive ? "pulse 2.5s infinite" : "none",
                  }}
                />
                <span style={{ color: "#dde", ...mono, fontWeight: 700, fontSize: "0.83rem", flex: 1 }}>
                  {cl.label}
                </span>
                {isActive && (
                  <span
                    style={{
                      fontSize: "0.62rem",
                      color: cl.color,
                      ...mono,
                      background: `${cl.color}14`,
                      border: `1px solid ${cl.color}33`,
                      borderRadius: 3,
                      padding: "1px 6px",
                    }}
                  >
                    ACTIVE
                  </span>
                )}
                <span
                  style={{
                    fontSize: "0.63rem",
                    ...es,
                    ...mono,
                    padding: "1px 6px",
                    borderRadius: 3,
                    border: `1px solid ${es.border}`,
                    background: es.bg,
                    color: es.text,
                  }}
                >
                  {cl.env}
                </span>
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid #0a1018",
                  display: "flex",
                  gap: 14,
                }}
                onClick={() => onSwitch(cl.id)}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span
                    style={{
                      fontSize: "0.59rem",
                      color: "#1e3a52",
                      ...mono,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Provider
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#7dd3fc", ...mono }}>
                    {PROVIDER_ICON[cl.provider] || PROVIDER_ICON.k8s} {(cl.provider || "k8s").toUpperCase()}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span
                    style={{
                      fontSize: "0.59rem",
                      color: "#1e3a52",
                      ...mono,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Region
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "#aac", ...mono }}>{cl.region}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span
                    style={{
                      fontSize: "0.59rem",
                      color: "#1e3a52",
                      ...mono,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Context
                  </span>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: "#3a5878",
                      ...mono,
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cl.context}
                  </span>
                </div>
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid #0a1018",
                  display: "flex",
                  gap: 16,
                }}
                onClick={() => onSwitch(cl.id)}
              >
                {[
                  { label: "Nodes", ok: readyNodes, total: nodes.length },
                  { label: "Pods", ok: runningPods, total: pods.length },
                  {
                    label: "Deploys",
                    ok: deps.filter((d) => !d.ready?.startsWith("0")).length,
                    total: deps.length,
                  },
                ].map(({ label, ok, total }) => (
                  <div key={label} style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                        fontSize: "0.63rem",
                        color: "#1e3a52",
                        ...mono,
                      }}
                    >
                      <span>{label}</span>
                      <span style={{ color: ok < total ? "#f5c518" : "#39ff8a" }}>
                        {ok}/{total}
                      </span>
                    </div>
                    <div style={{ height: 2, background: "#080e18", borderRadius: 1 }}>
                      <div
                        style={{
                          height: "100%",
                          width: total ? `${(ok / total) * 100}%` : "100%",
                          background: ok < total ? "#f5c518" : "#39ff8a",
                          borderRadius: 1,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {failingPods.length > 0 && (
                <div
                  style={{
                    padding: "7px 14px",
                    background: "#1a080820",
                    borderBottom: "1px solid #0a1018",
                  }}
                  onClick={() => onSwitch(cl.id)}
                >
                  {failingPods.slice(0, 2).map((p) => (
                    <div
                      key={p.name}
                      style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}
                    >
                      <AlertTriangle size={12} style={{ color: "#ff4d4d", flexShrink: 0 }} />
                      <span style={{ color: "#ff6060", ...mono, fontSize: "0.67rem" }}>{p.name}</span>
                      <span style={{ color: "#ff4d4d", ...mono, fontSize: "0.65rem", marginLeft: "auto" }}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                  {failingPods.length > 2 && (
                    <span style={{ color: "#ff4d4d", ...mono, fontSize: "0.63rem" }}>
                      +{failingPods.length - 2} more
                    </span>
                  )}
                </div>
              )}
              <div style={{ padding: "8px 14px", display: "flex", gap: 5, flexWrap: "wrap" }}>
                {RESOURCE_TYPES.slice(0, 6).map((rt) => {
                  const items = clusterData[rt.key] || [];
                  const count = items.length;
                  const hasErr = items.some((r) =>
                    ["CrashLoopBackOff", "NotReady", "Error"].includes(r.status),
                  );
                  return (
                    <button
                      key={rt.key}
                      type="button"
                      onClick={() => {
                        onSwitch(cl.id);
                        onOpenResource(rt.key, cl.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: "#080e18",
                        border: `1px solid ${hasErr ? "#ff4d4d22" : "#0e1f2e"}`,
                        borderRadius: 4,
                        color: hasErr ? "#ff6060" : "#2d4a6a",
                        cursor: "pointer",
                        padding: "3px 8px",
                        ...mono,
                        fontSize: "0.67rem",
                        transition: "all 0.08s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#0a1420";
                        e.currentTarget.style.color = hasErr ? "#ff4d4d" : "#7dd3fc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#080e18";
                        e.currentTarget.style.color = hasErr ? "#ff6060" : "#2d4a6a";
                      }}
                    >
                      <span style={{ fontSize: "0.75rem" }}>{rt.icon}</span>
                      {count > 0 && (
                        <span style={{ color: hasErr ? "#ff4d4d" : "#1e3a52" }}>{count}</span>
                      )}
                      {rt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div
          style={{
            background: "#050910",
            border: "1px dashed #0a1420",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "30px",
            cursor: "pointer",
            minHeight: 200,
          }}
          onClick={onAddCluster}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#1e3a52";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#0a1420";
          }}
        >
          <Plus size={28} style={{ color: "#0e1f2e" }} />
          <span style={{ fontSize: "0.72rem", color: "#1e3a52", ...mono }}>Add cluster</span>
          <span style={{ fontSize: "0.64rem", color: "#0e1f2e", ...mono }}>
            Import kubeconfig or add context
          </span>
        </div>
      </div>
      {kubeconfigPaths && kubeconfigPaths.length > 0 && (
        <div
          style={{
            marginTop: 20,
            padding: "12px 14px",
            background: "#050910",
            borderTop: "1px solid #0a1018",
          }}
        >
          <div
            style={{
              fontSize: "0.59rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#1e3a52",
              ...mono,
              marginBottom: 8,
            }}
          >
            Loaded kubeconfig files ({kubeconfigPaths.length})
          </div>
          {kubeconfigPaths.map((p) => (
            <div
              key={p}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 4,
                fontSize: "0.65rem",
                color: "#2d4a6a",
                ...mono,
              }}
            >
              <span style={{ color: "#39ff8a", flexShrink: 0 }}>◉</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p}
              </span>
              <button
                type="button"
                onClick={() => onRemoveKubeconfigPath(p)}
                style={{
                  background: "none",
                  border: "1px solid #1a2030",
                  borderRadius: 3,
                  color: "#ff4d4d",
                  cursor: "pointer",
                  padding: "1px 6px",
                  fontSize: "0.62rem",
                  ...mono,
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
            {showManualInput ? (
              <>
                <input
                  type="text"
                  value={manualPath}
                  onChange={(e) => setManualPath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmitManualPath();
                    if (e.key === "Escape") {
                      setShowManualInput(false);
                      setManualPath("");
                    }
                  }}
                  placeholder="/path/to/kubeconfig.yaml"
                  autoFocus
                  style={{
                    flex: 1,
                    background: "#080e18",
                    border: "1px solid #0e1f2e",
                    borderRadius: 4,
                    color: "#7dd3fc",
                    padding: "4px 8px",
                    fontFamily: "inherit",
                    fontSize: "0.65rem",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={handleSubmitManualPath}
                  style={{
                    background: "#0e1f2e",
                    border: "1px solid #1a3a4a",
                    borderRadius: 4,
                    color: "#39ff8a",
                    cursor: "pointer",
                    padding: "4px 10px",
                    fontSize: "0.62rem",
                    ...mono,
                  }}
                >
                  Add
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowManualInput(true)}
                style={{
                  background: "none",
                  border: "1px dashed #1a2030",
                  borderRadius: 4,
                  color: "#1e3a52",
                  cursor: "pointer",
                  padding: "4px 10px",
                  fontSize: "0.62rem",
                  ...mono,
                }}
              >
                + Type a path
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
