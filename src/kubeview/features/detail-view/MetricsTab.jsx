import { useEffect, useState } from "react";
import { getPodMetrics } from "../../api/metrics";
import { cn } from "../../utils/cn";

function Bar({ value, max, label, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const barColor =
    color || (pct > 90 ? "#ff4d4d" : pct > 70 ? "#f5c518" : "#39ff8a");
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-2.5 bg-[#0a1018] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <span className={cn("font-mono text-[0.65rem] text-[#556] min-w-[60px] text-right", `text-[${barColor}]`)}>
        {label}
      </span>
    </div>
  );
}

export function MetricsTab({ obj, clusterId }) {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!obj?.namespace || !obj?.name) return;
    setLoading(true);
    setError(null);
    getPodMetrics(obj.namespace, obj.name)
      .then((m) => {
        setMetrics(m);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, [obj?.namespace, obj?.name, clusterId]);

  if (loading) {
    return (
      <div className={cn("p-6", "text-[#556] font-mono text-[0.75rem]")}>
        Loading metrics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className={cn("text-[#ff4d4d] font-mono text-[0.75rem] mb-2")}>
          ⚠ {error}
        </div>
        {error.toLowerCase().includes("metrics-server") && (
          <div className={cn("text-[#7dd3fc] text-[0.72rem] leading-relaxed")}>
            The metrics-server must be installed in the cluster to view resource usage.
            <br />
            Install with:
            <pre className={cn(
              "mt-1.5 p-3 rounded bg-[#0a1018] font-mono text-[0.7rem] text-[#c4b5fd] overflow-auto"
            )}>
              kubectl apply -f{" "}
              https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <div className={cn("p-6", "text-[#556] font-mono text-[0.75rem]")}>
        No metrics available for this pod.
      </div>
    );
  }

  return (
    <div className={cn("p-5 flex flex-col gap-4 overflow-auto h-full")}>
      {metrics.map((m) => (
        <div
          key={m.container}
          className={cn(
            "p-3.5 rounded-lg border",
            "bg-[#050910] border-[#0a1018]"
          )}
        >
          <div className="flex justify-between mb-2.5">
            <span className={cn("font-semibold text-[0.72rem]", "text-[#dde] font-mono")}>
              {m.container}
            </span>
            <span className={cn("font-mono text-[0.6rem]", "text-[#556]")}>
              {new Date(m.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* CPU */}
          <div className="mb-2.5">
            <div className={cn("font-mono text-[0.65rem] mb-0.5", "text-[#7dd3fc]")}>
              CPU
            </div>
            <div className={cn("font-mono text-[0.6rem] mb-0.5", "text-[#aac]")}>
              {m.cpu_usage_millicores.toFixed(1)}m
              {m.cpu_limit_millicores != null
                ? ` / ${m.cpu_limit_millicores.toFixed(0)}m`
                : ""}
              {m.cpu_request_millicores != null
                ? ` (req ${m.cpu_request_millicores.toFixed(0)}m)`
                : ""}
            </div>
            {m.cpu_limit_millicores != null && (
              <Bar
                value={m.cpu_usage_millicores}
                max={m.cpu_limit_millicores}
                label={`${(
                  (m.cpu_usage_millicores / m.cpu_limit_millicores) *
                  100
                ).toFixed(0)}%`}
                color="#7dd3fc"
              />
            )}
          </div>

          {/* Memory */}
          <div>
            <div className={cn("font-mono text-[0.65rem] mb-0.5", "text-[#c4b5fd]")}>
              Memory
            </div>
            <div className={cn("font-mono text-[0.6rem] mb-0.5", "text-[#aac]")}>
              {m.mem_usage_mib.toFixed(1)} MiB
              {m.mem_limit_mib != null
                ? ` / ${m.mem_limit_mib.toFixed(0)} MiB`
                : ""}
              {m.mem_request_mib != null
                ? ` (req ${m.mem_request_mib.toFixed(0)} MiB)`
                : ""}
            </div>
            {m.mem_limit_mib != null && (
              <Bar
                value={m.mem_usage_mib}
                max={m.mem_limit_mib}
                label={`${(
                  (m.mem_usage_mib / m.mem_limit_mib) *
                  100
                ).toFixed(0)}%`}
                color="#c4b5fd"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}