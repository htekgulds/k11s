import { Circle, Command, FileText } from "lucide-react";
import { cn } from "../../utils/cn";

export function StatusBar({ activeCluster, connected, version, kubeconfigPaths, onAddCluster }) {
  return (
    <div className={cn(
      "flex items-center gap-[14px] px-3 h-[22px] flex-shrink-0",
      "bg-[#030710] border-t border-[#080e18]",
      "font-mono text-[0.62rem] text-[#0e1f2e]"
    )}>
      <span className={cn(
        "inline-flex items-center gap-[4px]",
        connected ? "text-[#39ff8a] animate-pulse" : "text-[#ff4d4d]"
      )}>
        <Circle size={10} fill="currentColor" /> {connected ? "CONNECTED" : "DISCONNECTED"}
      </span>
      <span style={{ color: activeCluster?.color }}>{activeCluster?.label}</span>
      <span>{activeCluster?.context}</span>
      <span className={cn("ml-auto inline-flex items-center gap-[2px]")}>
        <FileText size={10} className="text-[#1e3a52]" />
        <span className="text-[#1e3a52]">{kubeconfigPaths?.length || 0} kubeconfig</span>
        <button
          type="button"
          onClick={onAddCluster}
          className={cn(
            "bg-none border-none cursor-pointer px-[3px] text-[0.62rem] font-mono",
            "text-[#2d4a6a] hover:text-[#bdd]"
          )}
          title="Add kubeconfig file"
        >
          +
        </button>
      </span>
      <span className="inline-flex items-center gap-[2px]">
        <Command size={10} /> K palette · NPDSVICXL open resource tabs
      </span>
      <span>{version}</span>
    </div>
  );
}