import { cn } from "../../utils/cn";

export function DropZoneOverlay({ isDragging }) {
  if (!isDragging) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-[3000] flex items-center justify-center",
      "bg-black/82 animate-fade-in"
    )}>
      <div className={cn(
        "border-2 border-dashed rounded-xl p-[48px_64px] text-center",
        "border-[#39ff8a] font-mono"
      )}>
        <div className="text-6xl mb-3 text-[#39ff8a]">
          📄
        </div>
        <div className="text-xl text-[#bdd] mb-2">
          Drop YAML file here
        </div>
        <div className="text-sm text-[#4a7a8a]">
          .yaml or .yml — will be applied to the active cluster
        </div>
      </div>
    </div>
  );
}