import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Hexagon, Box, AlertTriangle, Info, Server, Cloud, Cpu, Database } from "lucide-react";
import { cn } from "../../utils/cn";
import { getClusterDashboard } from "../../api/dashboard";
import { PROVIDER_ICON } from "../../theme";

// ── Color helpers ──────────────────────────────────────────────────────────

const healthColor = (ready, total) => {
  if (total === 0) return "text-[#4a7a8a]";
  if (ready === total) return "text-[#39ff8a]";
  if (ready > 0) return "text-[#f5c518]";
  return "text-[#ff4d4d]";
};

const eventTypeColor = (type) => {
  if (type === "Warning") return "text-[#f5c518]";
  if (type === "Normal") return "text-[#7dd3fc]";
  return "text-[#c8d6e5]";
};

// ── Mini card component ────────────────────────────────────────────────────

function StatCard({ icon, value, label, color }) {
  return (
    <div className={cn(
      "p-[10px_12px] rounded-lg border font-mono",
      "bg-[#080e18] border-[#0e1f2e]"
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[0.55rem] text-[#2d4a6a]">{label}</span>
      </div>
      <div className={cn("text-[1.2rem] font-semibold leading-tight", color)}>
        {value}
      </div>
    </div>
  );
}

// ── Resource button ────────────────────────────────────────────────────────

function ResItem({ count, label, color }) {
  return (
    <div className={cn(
      "p-[8px] rounded border text-center font-mono",
      "bg-[#080e18] border-[#0e1f2e]"
    )}>
      <div className={cn("text-[1.1rem] font-semibold leading-tight", color)}>
        {count}
      </div>
      <div className="text-[0.55rem] text-[#2d4a6a] mt-0.5 truncate">
        {label}
      </div>
    </div>
  );
}

// ── Event row ──────────────────────────────────────────────────────────────

function EventRow({ ev, isWarn }) {
  return (
    <tr className={isWarn ? "bg-[#1a1000]" : ""}>
      <td className={cn("px-[8px] py-[6px] border-b border-[#0e1f2e] w-[60px]", eventTypeColor(ev.type))}>
        {ev.type === "Warning" ? <AlertTriangle size={10} /> : <Info size={10} />}
      </td>
      <td className={cn("px-[8px] py-[6px] border-b border-[#0e1f2e] w-[80px]", isWarn ? "text-[#f5c518]" : "text-[#7dd3fc]")}>
        {ev.reason}
      </td>
      <td className="px-[8px] py-[6px] border-b border-[#0e1f2e] text-[#c8d6e5] truncate max-w-[160px]">
        {ev.namespace}/{ev.name}
      </td>
      <td className="px-[8px] py-[6px] border-b border-[#0e1f2e] text-[#c8d6e5] truncate max-w-[160px]">
        {ev.message}
      </td>
      <td className={cn("px-[8px] py-[6px] border-b border-[#0e1f2e] w-[40px] text-right text-[#2d4a6a]")}>
        {ev.count > 1 ? `×${ev.count}` : ""}
      </td>
      <td className={cn("px-[8px] py-[6px] border-b border-[#0e1f2e] w-[50px] text-right text-[#2d4a6a]")}>
        {ev.last_seen}
      </td>
    </tr>
  );
}

// ── Main Dashboard component ───────────────────────────────────────────────

export function Dashboard({ clusterId, onRefreshResource }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    if (!clusterId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getClusterDashboard(clusterId);
      setData(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex-1 overflow-auto p-[12px_16px] bg-[#060a10]">
        <div className="font-mono text-[0.71rem] text-[#4a7a8a] p-5">
          Fetching cluster dashboard…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto p-[12px_16px] bg-[#060a10]">
        <div className={cn(
          "p-[10px_14px] rounded-lg border font-mono text-[0.71rem]",
          "bg-[#1a0808] border-[#ff4d4d44] text-[#ff4d4d]"
        )}>
          <AlertTriangle size={12} className="mr-1.5 inline" />
          Failed to load dashboard: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { node_health: nh, resource_counts: rc, recent_events: events, cluster_info: ci } = data;

  const resources = [
    { key: "pods", count: rc.pods, label: "Pods", color: "text-[#39ff8a]" },
    { key: "deployments", count: rc.deployments, label: "Deployments", color: "text-[#7dd3fc]" },
    { key: "statefulsets", count: rc.statefulsets, label: "StatefulSets", color: "text-[#a5f3fc]" },
    { key: "services", count: rc.services, label: "Services", color: "text-[#f9a8d4]" },
    { key: "ingresses", count: rc.ingresses, label: "Ingresses", color: "text-[#fde68a]" },
    { key: "configmaps", count: rc.configmaps, label: "ConfigMaps", color: "text-[#c4b5fd]" },
    { key: "secrets", count: rc.secrets, label: "Secrets", color: "text-[#fb923c]" },
    { key: "pvcs", count: rc.pvcs, label: "Volumes", color: "text-[#fdba74]" },
  ];

  return (
    <div className="flex-1 overflow-auto p-[12px_16px] bg-[#060a10]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[14px]">
        <div className="flex items-center gap-2 text-[#bdd] font-mono text-[0.85rem] font-medium">
          <Hexagon size={16} color="#39ff8a" />
          Cluster Dashboard — {ci.name || clusterId}
        </div>
        <button
          type="button"
          onClick={fetchDashboard}
          className={cn(
            "px-[10px] py-1 rounded border font-mono text-[0.62rem] cursor-pointer",
            "bg-none border-[#0e1f2e] text-[#4a7a8a]",
            "flex items-center gap-1",
            "hover:text-[#bdd] hover:border-[#1a3a4a]"
          )}
        >
          <RefreshCw size={10} /> Refresh
        </button>
      </div>

      {/* Cluster Info */}
      <div className={cn(
        "p-[10px_14px] rounded-lg border flex items-center gap-[10px] font-mono mb-[16px]",
        "bg-[#080e18] border-[#0e1f2e]"
      )}>
        <Server size={14} color="#4a7a8a" />
        <div>
          <div className="text-[0.6rem] text-[#2d4a6a]">Cluster</div>
          <div className="text-[0.75rem] text-[#bdd]">{ci.version}</div>
        </div>
        <div className="w-px h-6 bg-[#0e1f2e] mx-[10px]" />
        <div>
          <div className="text-[0.6rem] text-[#2d4a6a]">Platform</div>
          <div className="flex items-center gap-1 text-[0.75rem] text-[#bdd]">
            {PROVIDER_ICON[ci.platform?.toLowerCase()] || <Cloud size={12} />}
            {ci.platform}
          </div>
        </div>
        <div className="w-px h-6 bg-[#0e1f2e] mx-[10px]" />
        <div>
          <div className="text-[0.6rem] text-[#2d4a6a]">Context</div>
          <div className="text-[0.75rem] text-[#bdd]">{clusterId}</div>
        </div>
      </div>

      {/* Node Health */}
      <div className="mb-[16px]">
        <div className="text-[0.57rem] text-[#4a7a8a] font-mono uppercase tracking-[0.12em] mb-2">
          Node Health
        </div>
        <div className={cn(
          "grid gap-2",
          "grid-cols-[repeat(auto-fit,minmax(100px,1fr))]"
        )}>
          <StatCard
            icon={<Hexagon size={14} color="#39ff8a" />}
            value={nh.ready}
            label="Ready"
            color="text-[#39ff8a]"
          />
          <StatCard
            icon={<Hexagon size={14} color="#ff4d4d" />}
            value={nh.not_ready}
            label="Not Ready"
            color={nh.not_ready > 0 ? "text-[#ff4d4d]" : "text-[#2d4a6a]"}
          />
          <StatCard
            icon={<Hexagon size={14} color="#f5c518" />}
            value={nh.unknown}
            label="Unknown"
            color={nh.unknown > 0 ? "text-[#f5c518]" : "text-[#2d4a6a]"}
          />
          <StatCard
            icon={<Hexagon size={14} color="#bdd" />}
            value={`${nh.ready}/${nh.total}`}
            label="Total Health"
            color={healthColor(nh.ready, nh.total)}
          />
          <StatCard
            icon={<Cpu size={14} color="#7dd3fc" />}
            value={nh.total_cpu || "—"}
            label="Total CPU"
            color={nh.total_cpu ? "text-[#7dd3fc]" : "text-[#2d4a6a]"}
          />
          <StatCard
            icon={<Database size={14} color="#f9a8d4" />}
            value={nh.total_memory || "—"}
            label="Total Memory"
            color={nh.total_memory ? "text-[#f9a8d4]" : "text-[#2d4a6a]"}
          />
        </div>
      </div>

      {/* Resource Counts */}
      <div className="mb-[16px]">
        <div className="text-[0.57rem] text-[#4a7a8a] font-mono uppercase tracking-[0.12em] mb-2">
          Resource Counts
        </div>
        <div className={cn(
          "grid gap-[6px]",
          "grid-cols-[repeat(auto-fill,minmax(76px,1fr))]"
        )}>
          {resources.map((r) => (
            <ResItem key={r.key} count={r.count} label={r.label} color={r.color} />
          ))}
        </div>
      </div>

      {/* Recent Events */}
      {events.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[0.57rem] text-[#4a7a8a] font-mono uppercase tracking-[0.12em] mb-2">
            Recent Events
            <span className="text-[#0e1f2e]">({events.length})</span>
          </div>
          <div className="overflow-auto">
            <table className={cn("w-full border-collapse font-mono text-[0.65rem]")}>
              <thead>
                <tr>
                  <th className={cn("text-left px-[8px] py-[6px] text-[#2d4a6a] border-b border-[#0e1f2e] font-normal whitespace-nowrap")}>Type</th>
                  <th className={cn("text-left px-[8px] py-[6px] text-[#2d4a6a] border-b border-[#0e1f2e] font-normal whitespace-nowrap")}>Reason</th>
                  <th className={cn("text-left px-[8px] py-[6px] text-[#2d4a6a] border-b border-[#0e1f2e] font-normal whitespace-nowrap")}>Source</th>
                  <th className={cn("text-left px-[8px] py-[6px] text-[#2d4a6a] border-b border-[#0e1f2e] font-normal whitespace-nowrap")}>Message</th>
                  <th className={cn("text-right px-[8px] py-[6px] text-[#2d4a6a] border-b border-[#0e1f2e] font-normal whitespace-nowrap w-[40px]")}>Count</th>
                  <th className={cn("text-right px-[8px] py-[6px] text-[#2d4a6a] border-b border-[#0e1f2e] font-normal whitespace-nowrap w-[50px]")}>Age</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => (
                  <EventRow key={`${ev.namespace}/${ev.name}/${i}`} ev={ev} isWarn={ev.type === "Warning"} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="font-mono text-[0.65rem] text-[#2d4a6a] py-3">
          No recent events to display.
        </div>
      )}
    </div>
  );
}