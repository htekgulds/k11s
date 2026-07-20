import { cn } from "../../utils/cn";
import { nsColor } from "../../utils/colors";
import { FieldRow } from "../../components/ui/FieldRow";
import { Pill } from "../../components/ui/Pill";
import { StatusDot } from "../../components/ui/StatusDot";
import { kindColor } from "../../utils/colors";
import { STATUS_COLOR } from "../../theme";

function detailFields(obj, type) {
  if (type === "pods") {
    return [
      { l: "Status", v: <StatusDot status={obj.status} /> },
      { l: "Namespace", v: <Pill label={obj.namespace} color={nsColor(obj.namespace)} /> },
      {
        l: "Ready",
        v: (
          <span className={cn("font-mono font-bold", obj.ready?.startsWith("0") ? "text-[#ff4d4d]" : "text-[#39ff8a]")}>
            {obj.ready}
          </span>
        ),
      },
      {
        l: "Restarts",
        v: (
          <span className={cn(
            "font-mono font-bold",
            obj.restarts > 5 ? "text-[#ff4d4d]" : obj.restarts > 0 ? "text-[#f5c518]" : "text-[#39ff8a]"
          )}>
            {obj.restarts}
          </span>
        ),
      },
      { l: "Node", v: <span className="text-[#7dd3fc] font-mono">{obj.node}</span> },
      { l: "Pod IP", v: <span className="text-[#aac] font-mono">{obj.ip}</span> },
      { l: "Image", v: <span className="text-[#c4b5fd] font-mono">{obj.image}</span>, wide: true },
      { l: "Age", v: <span className="text-[#556] font-mono">{obj.age}</span> },
    ];
  }
  if (type === "deployments") {
    return [
      {
        l: "Ready",
        v: (
          <span className={cn("font-mono font-bold", obj.ready?.startsWith("0") ? "text-[#ff4d4d]" : "text-[#39ff8a]")}>
            {obj.ready}
          </span>
        ),
      },
      { l: "Namespace", v: <Pill label={obj.namespace} color={nsColor(obj.namespace)} /> },
      { l: "Up-to-date", v: <span className="text-[#aac] font-mono">{obj.up_to_date}</span> },
      {
        l: "Available",
        v: (
          <span className={cn("font-mono font-bold", obj.available === 0 ? "text-[#ff4d4d]" : "text-[#39ff8a]")}>
            {obj.available}
          </span>
        ),
      },
      { l: "Strategy", v: <Pill label={obj.strategy || "RollingUpdate"} color="#7dd3fc" /> },
      { l: "Image", v: <span className="text-[#c4b5fd] font-mono">{obj.image}</span>, wide: true },
      { l: "Age", v: <span className="text-[#556] font-mono">{obj.age}</span> },
    ];
  }
  if (type === "services") {
    return [
      {
        l: "Type",
        v: <Pill label={obj.type} color={obj.type === "LoadBalancer" ? "#39ff8a" : "#7dd3fc"} />,
      },
      { l: "Namespace", v: <Pill label={obj.namespace} color={nsColor(obj.namespace)} /> },
      { l: "Cluster IP", v: <span className="text-[#7dd3fc] font-mono">{obj.cluster_ip}</span> },
      {
        l: "External IP",
        v: (
          <span className={cn("font-mono", obj.external_ip === "<none>" ? "text-[#334]" : "text-[#f5c518]")}>
            {obj.external_ip}
          </span>
        ),
      },
      { l: "Ports", v: <span className="text-[#fde68a] font-mono">{obj.ports}</span>, wide: true },
      { l: "Age", v: <span className="text-[#556] font-mono">{obj.age}</span> },
    ];
  }
  if (type === "nodes") {
    return [
      { l: "Status", v: <StatusDot status={obj.status} /> },
      { l: "Roles", v: <Pill label={obj.roles} color="#7dd3fc" /> },
      { l: "Version", v: <span className="text-[#c4b5fd] font-mono">{obj.version}</span> },
      { l: "CPU", v: <span className="text-[#fde68a] font-mono">{obj.cpu}</span> },
      { l: "Memory", v: <span className="text-[#86efac] font-mono">{obj.mem}</span> },
      { l: "Pods", v: <span className="text-[#aac] font-mono">{obj.pods}</span> },
      { l: "Age", v: <span className="text-[#556] font-mono">{obj.age}</span> },
    ];
  }
  return Object.entries(obj).map(([k, v]) => ({
    l: k.replace(/_/g, " "),
    v: <span className="text-[#aac] font-mono">{String(v)}</span>,
  }));
}

export function InfoTab({ obj, type, related, onNavigate }) {
  return (
    <div className="flex-1 flex min-w-0">
      <div className="flex-1 overflow-y-auto p-[14px_18px]">
        <div className="grid grid-cols-2 gap-x-[22px]">
          {detailFields(obj, type).map((f, i) => (
            <FieldRow key={i} label={f.l} wide={f.wide}>
              {f.v}
            </FieldRow>
          ))}
        </div>
        <div className="mt-[18px]">
          <div className={cn(
            "text-[0.6rem] uppercase tracking-[0.1em] text-[#1e3a52] font-mono mb-[7px]"
          )}>
            Labels
          </div>
          <div className="flex gap-[5px] flex-wrap">
            {[`app=${obj.name.split("-")[0]}`, `env=prod`, `managed-by=helm`].map((l) => (
              <span
                key={l}
                className={cn(
                  "px-2 py-0.5 rounded text-[0.67rem] font-mono",
                  "bg-[#081420] border border-[#0e2030] text-[#5a8aaa]"
                )}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>
      {related.length > 0 && (
        <div className={cn(
          "w-[200px] border-l border-[#0a1018] overflow-y-auto flex-shrink-0",
          "bg-[#050910]"
        )}>
          <div className={cn(
            "px-[11px] py-[4px] text-[0.59rem] uppercase tracking-[0.1em] font-mono",
            "text-[#1e3a52]"
          )}>
            Related
          </div>
          {related.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onNavigate(r.resourceType, r.obj)}
              className={cn(
                "w-full flex flex-col gap-[2px] text-left bg-transparent border-none",
                "border-b border-[#080e16] px-[11px] py-[7px] cursor-pointer",
                "hover:bg-[#0a1420] transition-colors"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-[0.61rem] font-mono font-bold tracking-[0.04em]",
                  `text-[${kindColor(r.kind)}]`
                )}>
                  {r.kind}
                </span>
                <span
                  className={cn(
                    "w-[5px] h-[5px] rounded-full flex-shrink-0",
                    `bg-[${STATUS_COLOR[r.status] || "#39ff8a"}]`
                  )}
                />
              </div>
              <span className={cn(
                "text-[0.7rem] font-mono overflow-hidden text-ellipsis whitespace-nowrap",
                "text-[#7a9aaa]"
              )}>
                {r.name}
              </span>
              {r.ns && <span className={cn("text-[0.62rem] font-mono", `text-[${nsColor(r.ns)}]`)}>{r.ns}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}