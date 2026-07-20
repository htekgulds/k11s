import { COMMON_RESOURCES, getResourceIcon } from "../../constants";
import { kindColorMap, mono } from "../../theme";
import { cn } from "../../utils/cn";
import { GraphView } from "./GraphView";

export function GraphTab({ graph, allData, onNavigate }) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className={cn(
        "px-[13px] py-1.5 border-b border-[#0a1018] flex items-center gap-2.5",
        "bg-[#050910] flex-shrink-0 flex-wrap"
      )}>
        <span className={cn(
          "text-[0.59rem] uppercase tracking-[0.1em] text-[#1e3a52] font-mono"
        )}>
          resource graph · click nodes to navigate
        </span>
        <div className={cn("ml-auto flex gap-2 flex-wrap")}>
          {Object.entries(kindColorMap).map(([k, c]) => (
            <span
              key={k}
              className={cn(
                "text-[0.61rem] flex items-center gap-1 font-mono"
              )}
              style={{ color: c }}
            >
              <span
                className="w-1.25 h-1.25 rounded-full inline-block"
                style={{ background: c }}
              />
              {k}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <GraphView
          graph={graph}
          onNavigate={(nd) => {
            const rt = COMMON_RESOURCES.find(
              (r) =>
                r.label.replace(/s$/, "") === nd.kind ||
                `${r.key.slice(0, -1)}` === nd.kind.toLowerCase()
            );
            if (rt) {
              const found = (allData[rt.key] || []).find((o) => o.name === nd.id);
              if (found) onNavigate(rt.key, found);
            } else {
              // Try nd.kind as a direct key (for dynamic resource graph nodes)
              const directKey = nd.kind?.toLowerCase().endsWith("s")
                ? nd.kind.toLowerCase()
                : `${nd.kind?.toLowerCase()}s`;
              const found = (allData[directKey] || []).find((o) => o.name === nd.id);
              if (found) onNavigate(directKey, found);
            }
          }}
        />
      </div>
    </div>
  );
}