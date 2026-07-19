import { useState, useRef, useEffect } from "react";
import { Plus, FileInput, ChevronDown, ChevronRight, LayoutDashboard } from "lucide-react";
import { COMMON_RESOURCES, getResourceIcon } from "../../constants";
import { cn } from "../../utils/cn";
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

  const otherResources = (discoveredResources || []).filter((r) => !r.is_common);

  const resourceButton = (plural, label) => {
    const count = (data[plural] || []).length;
    const hasErr = (data[plural] || []).some((r) =>
      ["CrashLoopBackOff", "NotReady", "Error"].includes(r.status)
    );
    const isAct = clusterState.activeResource === plural && !clusterState.activeTab;
    const isOpen = clusterState.activeResource === plural && !clusterState.activeTab;

    return (
      <button
        key={plural}
        type="button"
        onClick={() => onOpenResource(plural)}
        className={cn(
          "flex items-center justify-between w-full text-left px-2 py-1.5 font-mono text-[0.71rem]",
          "transition-colors",
          isAct
            ? `bg-[#080e18] border-l-2 border-[${clustersColor}] text-[#bdd]`
            : isOpen
            ? `border-l-2 border-[${clustersColor}]/33 text-[#4a7a8a] hover:bg-[#060c14]`
            : `border-l-2 border-transparent text-[#2d4a6a] hover:bg-[#060c14]`
        )}
      >
        <span className="flex items-center gap-1.5">
          {getResourceIcon(plural)}
          {label}
        </span>
        <span
          className={cn(
            "text-[0.62rem] font-bold",
            hasErr
              ? "text-[#ff4d4d]"
              : isAct
              ? `text-[${clustersColor}]`
              : isOpen
              ? "text-[#2d4a6a]"
              : "text-[#0e1f2e]"
          )}
        >
          {loading[plural] ? "…" : count || ""}
        </span>
      </button>
    );
  };

  return (
    <div
      className={cn(
        "w-[152px] h-full flex flex-col flex-shrink-0",
        "bg-[#030710] border-r border-[#080e18]"
      )}
    >
      <div className="flex-1 overflow-y-auto">
        {/* Dashboard */}
        <button
          type="button"
          onClick={() => onOpenResource("dashboard")}
          className={cn(
            "w-full px-2.5 py-1.5 flex items-center gap-1.5 text-left text-[0.71rem] font-mono",
            "transition-colors border-l-2",
            clusterState.activeResource === "dashboard" && !clusterState.activeTab
              ? `bg-[#080e18] border-[${clustersColor}] text-[#bdd]`
              : `border-transparent text-[#2d4a6a] hover:bg-[#060c14] hover:border-[${clustersColor}]/33`
          )}
        >
          <span className="flex items-center gap-1.5 text-[#39ff8a]">
            <LayoutDashboard size={12} />
            Dashboard
          </span>
        </button>

        <div className="px-2.5 pt-1 pb-0.5 mt-1 text-[0.57rem] uppercase tracking-[0.12em] font-mono text-[#0e1f2e]">
          Resources
        </div>
        {COMMON_RESOURCES.map((rt) => resourceButton(rt.key, rt.label))}

        {otherResources.length > 0 && (
          <>
            <div className="px-1.5 pt-0.5 mt-0.5">
              <button
                type="button"
                onClick={() => setOtherOpen((v) => !v)}
                className={cn(
                  "w-full flex items-center gap-1 text-left px-1 py-1 text-[0.6rem] font-mono",
                  "text-[#1e3a52] hover:bg-[#060c14] rounded transition-colors"
                )}
              >
                {otherOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                Other Resources ({otherResources.length})
              </button>
            </div>
            {otherOpen && otherResources.map((r) => resourceButton(r.plural, r.kind || r.plural))}
          </>
        )}
      </div>

      <PortForwardPanel clusterId={activeCluster?.id} />

      <div className="border-t border-[#080e18]">
        {showManualInput ? (
          <div className="p-2">
            <input
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitManualPath();
                if (e.key === "Escape") { setShowManualInput(false); setManualPath(""); }
              }}
              placeholder="/path/to/kubeconfig"
              autoFocus
              className={cn(
                "w-full box-border mb-1 rounded px-1.5 py-1 text-[0.62rem] font-mono",
                "bg-[#080e18] border border-[#0e1f2e] text-[#7dd3fc] outline-none"
              )}
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleSubmitManualPath}
                className={cn(
                  "flex-1 px-1.5 py-0.75 rounded text-[0.6rem] font-mono cursor-pointer",
                  "bg-[#0e1f2e] border border-[#1a3a4a] text-[#39ff8a]"
                )}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowManualInput(false); setManualPath(""); }}
                className={cn(
                  "px-1.5 py-0.75 rounded text-[0.6rem] font-mono cursor-pointer",
                  "bg-transparent border border-[#1a2030] text-[#4a7a8a]"
                )}
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
              className={cn(
                "w-full flex items-center gap-1.5 px-2.5 py-2 text-left text-[0.71rem] font-mono",
                "text-[#4a7a8a] hover:bg-[#060c14] hover:text-[#bdd]",
                "border-b border-[#080e18] transition-colors"
              )}
            >
              <Plus size={14} />
              Add Cluster
            </button>
            <button
              type="button"
              onClick={() => setShowManualInput(true)}
              className={cn(
                "w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left text-[0.65rem] font-mono",
                "text-[#1e3a52] hover:bg-[#060c14] hover:text-[#4a7a8a]",
                "transition-colors"
              )}
            >
              <FileInput size={12} />
              Type path…
            </button>
          </>
        )}
      </div>
    </div>
  );
}