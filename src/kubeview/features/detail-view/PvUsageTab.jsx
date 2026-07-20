import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { StatusDot } from "../../components/ui/StatusDot";

export function PvUsageTab({ data, loading, filter }) {
  const rows = useMemo(() => {
    if (!filter) return data || [];
    const lf = filter.toLowerCase();
    return (data || []).filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(lf))
    );
  }, [data, filter]);

  if (loading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center gap-2", "text-[#39ff8a] font-mono text-[0.76rem]")}>
        Loading PV/PVC usage…
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-[4px] flex-shrink-0",
        "bg-[#050910] border-b border-[#080e18]"
      )}>
        <span className={cn("font-mono text-[0.62rem]", "text-[#0a1420]")}>
          {(data || []).length} volumes
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className={cn("w-full border-collapse font-mono text-[0.74rem]")}>
          <thead>
            <tr className={cn(
              "bg-[#050910] text-[#4a7a8a] uppercase tracking-[0.05em]",
              "text-[0.65rem] sticky top-0 z-10"
            )}>
              <th className={cn("px-[10px] py-[6px] text-left border-b border-[#080e18]")}>PV Name</th>
              <th className={cn("px-[10px] py-[6px] text-left border-b border-[#080e18]")}>Capacity</th>
              <th className={cn("px-[10px] py-[6px] text-left border-b border-[#080e18]")}>Status</th>
              <th className={cn("px-[10px] py-[6px] text-left border-b border-[#080e18]")}>StorageClass</th>
              <th className={cn("px-[10px] py-[6px] text-left border-b border-[#080e18]")}>PVC (NS/Name)</th>
              <th className={cn("px-[10px] py-[6px] text-left border-b border-[#080e18]")}>Usage</th>
              <th className={cn("px-[10px] py-[6px] text-left border-b border-[#080e18]")}>Age</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-5 text-center text-[#4a7a8a]">
                  No persistent volumes found
                </td>
              </tr>
            ) : rows.map((r, i) => (
              <tr
                key={r.pv_name + "-" + i}
                className={cn(
                  "border-b border-[#080e18]",
                  i % 2 === 0 ? "bg-transparent" : "bg-white/[0.015]"
                )}
              >
                <td className={cn("px-[10px] py-[5px] text-[#d4e6f5]")}>{r.pv_name}</td>
                <td className={cn("px-[10px] py-[5px] text-[#a0c0d0]")}>{r.capacity}</td>
                <td className="px-[10px] py-[5px]">
                  <StatusDot status={r.status.toLowerCase()} />
                  <span className={cn("ml-1.5 text-[#a0c0d0]")}>{r.status}</span>
                </td>
                <td className={cn("px-[10px] py-[5px] text-[#a0c0d0]")}>{r.storage_class}</td>
                <td className={cn("px-[10px] py-[5px] text-[#a0c0d0]")}>{r.used_by}</td>
                <td className={cn("px-[10px] py-[5px]", r.usage_percent !== "—" ? "text-[#39ff8a]" : "text-[#4a7a8a]")}>
                  {r.usage_percent}
                </td>
                <td className={cn("px-[10px] py-[5px] text-[#4a7a8a]")}>{r.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}