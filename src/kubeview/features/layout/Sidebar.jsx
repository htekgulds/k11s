import { useState } from "react";
import { Plus, FileInput, ChevronDown, ChevronRight } from "lucide-react";
import { COMMON_RESOURCES, getResourceIcon } from "../../constants";
import { mono } from "../../theme";
import { PortForwardPanel } from "../port-forward/PortForwardPanel";

export function Sidebar({
  clusterState,
  activeCluster,
  data,
  loading,
  onOpenResource,
  onAddCluster,
  onAddKubeconfigByPath,
  discoveredResources,
}) {
  const clustersColor = activeCluster?.color || "#39ff8a";
  const [manualPath, setManualPath] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);

  const otherResources = (discoveredResources || []).filter((r) => !r.is_common);

  const handleSubmitManualPath = async () => {
    const trimmed = manualPath.trim();
    if (!trimmed) return;
    try {
      await onAddKubeconfigByPath(trimmed);
      setManualPath("");
      setShowManualInput(false);
    } catch (e) {
      console.error("Failed to add kubeconfig by path:", e);
    }
  };

  const itemStyle = (isAct, isOpen) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: isAct ? "#080e18" : "none",
    border: "none",
    borderLeft: isAct
      ? `2px solid ${clustersColor}`
      : isOpen
        ? `2px solid ${clustersColor}55`
        : "2px solid transparent",
    color: isAct ? "#bdd" : isOpen ? "#4a7a8a" : "#2d4a6a",
    padding: "6px 9px 6px 10px",
    cursor: "pointer",
    ...mono,
    fontSize: "0.71rem",
    width: "100%",
    textAlign: "left",
  });

  const resourceButton = (plural, label) => {
    const count = (data[plural] || []).length;
    const hasErr = (data[plural] || []).some((r) =>
      ["CrashLoopBackOff", "NotReady", "Error"].includes(r.status),
    );
    const isAct = clusterState.activeResource === plural && !clusterState.activeTab;
    const isOpen = clusterState.activeResource === plural && !clusterState.activeTab;
    return (
      <button
        key={plural}
        type="button"
        onClick={() => onOpenResource(plural)}
        style={itemStyle(isAct, isOpen)}
        onMouseEnter={(e) => {
          if (!isAct) e.currentTarget.style.background = "#060c14";
        }}
        onMouseLeave={(e) => {
          if (!isAct) e.currentTarget.style.background = "none";
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {getResourceIcon(plural)}
          {label}
        </span>
        <span
          style={{
            fontSize: "0.62rem",
            color: hasErr ? "#ff4d4d" : isAct ? clustersColor : isOpen ? "#2d4a6a" : "#0e1f2e",
          }}
        >
          {loading[plural] ? "…" : count || ""}
        </span>
      </button>
    );
  };

  return (
    <div
      style={{
        width: 152,
        background: "#030710",
        borderRight: "1px solid #080e18",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div style={{ flex: 1, overflowY: "auto" }}>
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
        {COMMON_RESOURCES.map((rt) => resourceButton(rt.key, rt.label))}

        {otherResources.length > 0 && (
          <>
            <div
              style={{
                padding: "2px 6px",
                borderTop: "1px solid #080e18",
                marginTop: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setOtherOpen((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  color: "#1e3a52",
                  cursor: "pointer",
                  ...mono,
                  fontSize: "0.6rem",
                  width: "100%",
                  textAlign: "left",
                  padding: "4px 4px",
                }}
              >
                {otherOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                Other Resources ({otherResources.length})
              </button>
            </div>
            {otherOpen &&
              otherResources.map((r) => resourceButton(r.plural, r.kind || r.plural))}
          </>
        )}
      </div>

      <PortForwardPanel clusterId={activeCluster?.id} />

      <div style={{ borderTop: "1px solid #080e18" }}>
        {showManualInput ? (
          <div style={{ padding: "6px 8px" }}>
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
              placeholder="/path/to/kubeconfig"
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#080e18",
                border: "1px solid #0e1f2e",
                borderRadius: 4,
                color: "#7dd3fc",
                padding: "4px 6px",
                fontFamily: "inherit",
                fontSize: "0.62rem",
                outline: "none",
                marginBottom: 4,
              }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                onClick={handleSubmitManualPath}
                style={{
                  flex: 1,
                  background: "#0e1f2e",
                  border: "1px solid #1a3a4a",
                  borderRadius: 4,
                  color: "#39ff8a",
                  cursor: "pointer",
                  padding: "3px 6px",
                  fontSize: "0.6rem",
                  ...mono,
                }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowManualInput(false); setManualPath(""); }}
                style={{
                  background: "none",
                  border: "1px solid #1a2030",
                  borderRadius: 4,
                  color: "#4a7a8a",
                  cursor: "pointer",
                  padding: "3px 6px",
                  fontSize: "0.6rem",
                  ...mono,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onAddCluster}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                borderBottom: "1px solid #080e18",
                color: "#4a7a8a",
                padding: "8px 10px",
                cursor: "pointer",
                ...mono,
                fontSize: "0.71rem",
                width: "100%",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#060c14"; e.currentTarget.style.color = "#bdd"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#4a7a8a"; }}
            >
              <Plus size={14} />
              Add Cluster
            </button>
            <button
              type="button"
              onClick={() => setShowManualInput(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                color: "#1e3a52",
                padding: "6px 10px",
                cursor: "pointer",
                ...mono,
                fontSize: "0.65rem",
                width: "100%",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#060c14"; e.currentTarget.style.color = "#4a7a8a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#1e3a52"; }}
            >
              <FileInput size={12} />
              Type path...
            </button>
          </>
        )}
      </div>
    </div>
  );
}
