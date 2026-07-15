import { mono } from "../../theme";
import { nsColor } from "../../utils/colors";
import { StatusDot } from "../../components/ui/StatusDot";

export function HelmReleasesTab({
  data,
  loading,
  filter,
}) {
  const rows = data.filter((r) => {
    const txOk =
      !filter || Object.values(r).some((v) => String(v).toLowerCase().includes(filter.toLowerCase()));
    return txOk;
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "4px 12px",
          background: "#050910",
          borderBottom: "1px solid #080e18",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#0a1420", ...mono, fontSize: "0.62rem" }}>
          {(data || []).length} releases
        </span>
      </div>
      {loading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "#39ff8a",
            ...mono,
            fontSize: "0.76rem",
          }}
        >
          Loading helm releases…
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: "0.74rem" }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, background: "#050910", zIndex: 5 }}>
                {["name", "namespace", "chart", "version", "status", "revision", "updated"].map((c) => (
                  <th
                    key={c}
                    style={{
                      padding: "7px 13px",
                      textAlign: "left",
                      color: "#1e3a52",
                      fontWeight: 700,
                      fontSize: "0.61rem",
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                      borderBottom: "1px solid #0a1018",
                      cursor: "pointer",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
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
                  style={{
                    borderBottom: "1px solid #060c14",
                    transition: "background 0.07s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#0a1420"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap", color: "#ccd", fontWeight: 600 }}>
                    {row.name}
                  </td>
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap" }}>
                    <span style={{ color: nsColor(row.namespace), fontSize: "0.71rem" }}>{row.namespace}</span>
                  </td>
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap", color: "#7a6aaa", fontSize: "0.69rem" }}>
                    {row.chart}
                  </td>
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap", color: "#3a5878" }}>
                    {row.version}
                  </td>
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap" }}>
                    <StatusDot status={row.status} />
                  </td>
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap", color: "#3a5878" }}>
                    v{row.revision}
                  </td>
                  <td style={{ padding: "7px 13px", whiteSpace: "nowrap", color: "#3a5878", fontSize: "0.69rem" }}>
                    {row.updated ? row.updated.slice(0, 19).replace("T", " ") : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      color: "#0e1a26",
                      padding: "50px",
                      ...mono,
                      fontSize: "0.72rem",
                    }}
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
