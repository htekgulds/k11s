import { useState, useEffect, useMemo } from "react";
import { cn } from "../../utils/cn";
import { listIngressRules } from "../../api/ingressRules";

export function IngressRulesTab({ clusterId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    setLoading(true);
    setFilterText("");
    listIngressRules(clusterId)
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [clusterId]);

  const rows = useMemo(() => {
    if (!filterText) return data;
    const lf = filterText.toLowerCase();
    return data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(lf))
    );
  }, [data, filterText]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={cn(
        "flex items-center gap-1.5 px-3 py-[4px] flex-shrink-0",
        "bg-[#050910] border-b border-[#080e18]"
      )}>
        <input
          type="text"
          placeholder="Filter rules…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className={cn(
            "rounded px-2 py-[3px] font-mono text-[0.72rem] outline-none",
            "bg-[#0a1420] border border-[#12202e] text-[#8ab] w-[180px]",
            "focus:border-[#39ff8a]"
          )}
        />
        <span className={cn("ml-auto font-mono text-[0.62rem]", "text-[#0a1420]")}>
          {(data || []).length} rules
        </span>
      </div>
      {loading ? (
        <div className={cn("flex-1 flex items-center justify-center gap-2", "text-[#39ff8a] font-mono text-[0.76rem]")}>
          Loading ingress rules…
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className={cn("w-full border-collapse font-mono text-[0.74rem]")}>
            <thead>
              <tr className={cn("sticky top-0 z-5 bg-[#050910]")}>
                {["Host", "Path", "PathType", "Service", "Port", "TLS"].map((c) => (
                  <th
                    key={c}
                    className={cn(
                      "px-[13px] py-[7px] text-left",
                      "text-[#1e3a52] font-bold text-[0.61rem] uppercase tracking-[0.09em]",
                      "border-b border-[#0a1018] cursor-pointer select-none whitespace-nowrap"
                    )}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={`${row.host}-${row.path}-${i}`}
                  className={cn(
                    "border-b border-[#060c14]",
                    "hover:bg-[#0a1420] transition-colors duration-[70ms]"
                  )}
                >
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap font-semibold text-[#ccd]")}>
                    {row.host || "*"}
                  </td>
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap text-[#7a6aaa] font-mono")}>
                    {row.path}
                  </td>
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap text-[#3a5878]")}>
                    {row.path_type}
                  </td>
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap text-[#a0c0d0]")}>
                    {row.service_name}
                  </td>
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap text-[#3a5878]")}>
                    {row.service_port}
                  </td>
                  <td className={cn("px-[13px] py-[7px] whitespace-nowrap text-[#39ff8a]")}>
                    {row.tls_hosts || "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className={cn(
                      "p-12 text-center font-mono text-[0.72rem]",
                      "text-[#0e1a26]"
                    )}
                  >
                    No ingress rules found{filterText ? ` matching "${filterText}"` : ""}
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