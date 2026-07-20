import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { StatusDot } from "../../components/ui/StatusDot";
import { nsColor } from "../../utils/colors";

export function HelmReleasesTab({ data, loading, filter }) {
  const rows = useMemo(() => {
    if (!data) return [];
    if (!filter) return data;
    const lf = filter.toLowerCase();
    return data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(lf))
    );
  }, [data, filter]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-[4px] flex-shrink-0",
        "bg-[#050910] border-b border-[#080e18]"
      )}>
        <span className={cn("font-mono text-[0.62rem]", "text-[#0a1420]")}>
          {(data || []).length} releases
        </span>
      </div>
      {loading ? (
        <div className={cn("flex-1 flex items-center justify-center gap-2", "text-[#39ff8a] font-mono text-[0.76rem]")}>
          Loading helm releases…
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className={cn("w-full border-collapse font-mono text-[0.74rem]")}>
            <thead>
              <tr className={cn("sticky top-0 z-5 bg-[#050910]")}>
                {["name", "namespace", "chart", "version", "status", "revision", "updated"].map((c) => (
                  <th
                    key={c}
                    className={cn(
                      "px-[13px] py-[7px] text-left",
                      "text-[#1e3a52] font-bold text-[0.61rem] uppercase tracking-[0.09em]",
                      "border-b border-[#0a1018] cursor-pointer select-none whitespace-nowrap"
                    )}
                  >
                    {c.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${row.namespace}-${row.name}-${i}`}
                  className={cn(
                    "border-b border-[#060c14]",
                    "hover:bg-[#0a1420] transition-colors duration-[70ms]"
                  )}
                >
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap font-semibold text-[#ccd]")}>
                    {row.name}
                  </td>
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap")}>
                    <span
                      className="font-mono text-[0.71rem]"
                      style={{ color: nsColor(row.namespace) }}
                    >
                      {row.namespace}
                    </span>
                  </td>
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap text-[#7a6aaa] text-[0.69rem]")}>
                    {row.chart}
                  </td>
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap text-[#3a5878]")}>
                    {row.version}
                  </td>
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap")}>
                    <StatusDot status={row.status} />
                  </td>
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap text-[#3a5878]")}>
                    v{row.revision}
                  </td>
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap text-[#3a5878] text-[0.69rem]")}>
                    {row.updated ? row.updated.slice(0, 19).replace("T", " ") : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className={cn(
                      "p-12 text-center font-mono text-[0.72rem]",
                      "text-[#0e1a26]"
                    )}
                  >
                    No helm releases found{filter ? ` matching "${filter}"` : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}