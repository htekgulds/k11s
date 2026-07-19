import { useMemo } from "react";
import { mono } from "../../theme";
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
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#39ff8a", ...mono, fontSize: "0.76rem" }}>
        Loading PV/PVC usage…
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 12px", background: "#050910", borderBottom: "1px solid #080e18", flexShrink: 0 }}>
        <span style={{ color: "#0a1420", ...mono, fontSize: "0.62rem" }}>
          {(data || []).length} volumes
        </span>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: "0.74rem" }}>
          <thead>
            <tr style={{ background: "#050910", color: "#4a7a8a", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem", position: "sticky", top: 0, zIndex: 1 }}>
              <th style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid #080e18" }}>PV Name</th>
              <th style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid #080e18" }}>Capacity</th>
              <th style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid #080e18" }}>Status</th>
              <th style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid #080e18" }}>StorageClass</th>
              <th style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid #080e18" }}>PVC (NS/Name)</th>
              <th style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid #080e18" }}>Usage</th>
              <th style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid #080e18" }}>Age</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "#4a7a8a" }}>
                  No persistent volumes found
                </td>
              </tr>
            ) : rows.map((r, i) => (
              <tr key={r.pv_name + "-" + i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)", borderBottom: "1px solid #080e18" }}>
                <td style={{ padding: "5px 10px", color: "#d4e6f5" }}>{r.pv_name}</td>
                <td style={{ padding: "5px 10px", color: "#a0c0d0" }}>{r.capacity}</td>
                <td style={{ padding: "5px 10px" }}><StatusDot status={r.status.toLowerCase()} /><span style={{ marginLeft: 5, color: "#a0c0d0" }}>{r.status}</span></td>
                <td style={{ padding: "5px 10px", color: "#a0c0d0" }}>{r.storage_class}</td>
                <td style={{ padding: "5px 10px", color: "#a0c0d0" }}>{r.used_by}</td>
                <td style={{ padding: "5px 10px", color: r.usage_percent !== "—" ? "#39ff8a" : "#4a7a8a" }}>{r.usage_percent}</td>
                <td style={{ padding: "5px 10px", color: "#4a7a8a" }}>{r.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
