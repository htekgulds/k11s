import { useRef, useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { COLUMNS, getColumns } from "../../constants";
import { mono } from "../../theme";
import { nsColor } from "../../utils/colors";
import { Pill } from "../../components/ui/Pill";
import { Spinner } from "../../components/ui/Spinner";
import { StatusDot } from "../../components/ui/StatusDot";
import { deleteResource } from "../../api";

export function ResourceListTab({
  type,
  data,
  loading,
  onSelect,
  onMiddleClick,
  filter,
  setFilter,
  namespace,
  onRefresh,
  clusterId,
}) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [hovered, setHovered] = useState(null);
  const [showColPicker, setShowColPicker] = useState(false);
  const [dragCol, setDragCol] = useState(null);
  const colPickerRef = useRef(null);
  const resizeRef = useRef(null);

  // Configurable columns — persisted in localStorage per resource type
  const allCols = COLUMNS[type] || Object.keys(data[0] || {});
  const storageKey = `k11s_cols_${type}`;
  const widthKey = `k11s_colw_${type}`;
  const orderKey = `k11s_order_${type}`;
  const [visibleCols, setVisibleCols] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : allCols;
    } catch { return allCols; }
  });
  const [colOrder, setColOrder] = useState(() => {
    try {
      const saved = localStorage.getItem(orderKey);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [colWidths, setColWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(widthKey);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Build effective column list: apply order (if saved), then filter visible
  const orderedCols = colOrder ? colOrder.filter((c) => visibleCols.includes(c)) : visibleCols;
  const cols = orderedCols.length ? orderedCols : visibleCols;

  // Keep visibleCols/order in sync when allCols changes (type switch)
  useEffect(() => {
    setVisibleCols((prev) => prev.filter((c) => allCols.includes(c)));
    setColOrder((prev) => prev ? prev.filter((c) => allCols.includes(c)) : null);
  }, [type]);

  const toggleCol = (col) => {
    setVisibleCols((prev) => {
      const next = prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  // Column reorder — HTML5 drag and drop
  const handleDragStart = (col) => (e) => {
    setDragCol(col);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (col) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (targetCol) => (e) => {
    e.preventDefault();
    if (!dragCol || dragCol === targetCol) return;
    const reordered = cols.filter((c) => c !== dragCol);
    const targetIdx = reordered.indexOf(targetCol);
    reordered.splice(targetIdx, 0, dragCol);
    setColOrder(reordered);
    localStorage.setItem(orderKey, JSON.stringify(reordered));
    setDragCol(null);
  };

  // Column resize
  const startResize = (col, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[col] || 100;
    resizeRef.current = { col, startX, startW };

    const onMove = (ev) => {
      if (!resizeRef.current) return;
      const { col: c, startX: sx, startW: sw } = resizeRef.current;
      const w = Math.max(40, sw + (ev.clientX - sx));
      setColWidths((prev) => {
        const next = { ...prev, [c]: w };
        localStorage.setItem(widthKey, JSON.stringify(next));
        return next;
      });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    if (!showColPicker) return;
    const close = (e) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setShowColPicker(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [showColPicker]);

  const rows = data.filter((r) => {
    const nsOk = !namespace || namespace === "All" || r.namespace === namespace || !r.namespace;
    const txOk =
      !filter || Object.values(r).some((v) => String(v).toLowerCase().includes(filter.toLowerCase()));
    return nsOk && txOk;
  });
  const sorted = sortCol
    ? [...rows].sort((a, b) => String(a[sortCol]).localeCompare(String(b[sortCol])) * sortDir)
    : rows;
  const handleSort = (c) => {
    if (sortCol === c) setSortDir((d) => -d);
    else {
      setSortCol(c);
      setSortDir(1);
    }
  };

  // Right-click context menu
  const [ctxMenu, setCtxMenu] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [ctxMenu]);
  const ctxAction = (fn) => { fn(); setCtxMenu(null); };
  const kind = type.replace(/s$/, "");
  const handleCtxDelete = async () => {
    const row = ctxMenu?.row;
    if (!row || !clusterId) return;
    setCtxMenu(null);
    setDelConfirm(row);
  };
  const confirmDelete = async (row) => {
    setDelConfirm(null);
    try {
      await deleteResource(clusterId, type, row.name, row.namespace || "", null, false);
      onRefresh();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

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
          {(data || []).length} items
        </span>
        <div style={{ position: "relative", marginLeft: 4 }} ref={colPickerRef}>
          <button
            type="button"
            onClick={() => setShowColPicker((v) => !v)}
            title="Toggle columns"
            style={{
              background: "none",
              border: "1px solid #0e1f2e",
              borderRadius: 3,
              color: "#1e3a52",
              cursor: "pointer",
              padding: "2px 7px",
              ...mono,
              fontSize: "0.67rem",
            }}
          >
            ☰ cols
          </button>
          {showColPicker && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 4,
                background: "#0a0f18",
                border: "1px solid #0e1f2e",
                borderRadius: 6,
                padding: "4px 0",
                zIndex: 50,
                minWidth: 150,
                boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
              }}
            >
              {allCols.map((c) => (
                <label
                  key={c}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 14px",
                    cursor: "pointer",
                    color: "#4a7a8a",
                    ...mono,
                    fontSize: "0.72rem",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visibleCols.includes(c)}
                    onChange={() => toggleCol(c)}
                    style={{ accentColor: "#39ff8a" }}
                  />
                  {c.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "1px solid #0e1f2e",
            borderRadius: 3,
            color: "#39ff8a",
            cursor: "pointer",
            padding: "2px 7px",
            ...mono,
            fontSize: "0.67rem",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {loading ? <Spinner /> : "↻"} refresh
        </button>
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
          <Spinner /> Loading {type}…
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", ...mono, fontSize: "0.74rem" }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, background: "#050910", zIndex: 5 }}>
                {cols.map((c) => (
                  <th
                    key={c}
                    draggable
                    onDragStart={handleDragStart(c)}
                    onDragOver={handleDragOver(c)}
                    onDrop={handleDrop(c)}
                    onClick={() => handleSort(c)}
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
                      width: colWidths[c] || undefined,
                      position: "relative",
                      opacity: dragCol === c ? 0.4 : 1,
                    }}
                  >
                    {c.replace(/_/g, " ")}
                    {sortCol === c ? (sortDir > 0 ? " ↑" : " ↓") : ""}
                    <div
                      onMouseDown={(e) => startResize(c, e)}
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: 5,
                        cursor: "col-resize",
                      }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                  <tr
                    key={`${row.name}-${i}`}
                    onClick={() => onSelect(row)}
                    onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onMiddleClick?.(row); } }}
                    onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, row }); }}
                    style={{
                    borderBottom: "1px solid #060c14",
                    cursor: "pointer",
                    background: hovered === i ? "#0a1420" : "transparent",
                    transition: "background 0.07s",
                  }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {cols.map((c) => (
                    <td
                      key={c}
                      style={{
                        padding: "7px 13px",
                        whiteSpace: "nowrap",
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c === "status" ? (
                        <StatusDot status={row[c]} />
                      ) : c === "namespace" ? (
                        <span style={{ color: nsColor(row[c]), fontSize: "0.71rem" }}>{row[c]}</span>
                      ) : c === "restarts" && row[c] > 5 ? (
                        <span style={{ color: "#ff4d4d", fontWeight: 700 }}>{row[c]}</span>
                      ) : c === "restarts" && row[c] > 0 ? (
                        <span style={{ color: "#f5c518" }}>{row[c]}</span>
                      ) : c === "ready" && row[c]?.startsWith("0") ? (
                        <span style={{ color: "#ff4d4d" }}>{row[c]}</span>
                      ) : c === "name" ? (
                        <span style={{ color: "#ccd", fontWeight: 600 }}>{row[c]}</span>
                      ) : c === "type" && row[c] === "LoadBalancer" ? (
                        <Pill label={row[c]} color="#39ff8a" />
                      ) : c === "external_ip" && row[c] !== "<none>" ? (
                        <span style={{ color: "#f5c518" }}>{row[c]}</span>
                      ) : c === "image" ? (
                        <span style={{ color: "#7a6aaa", fontSize: "0.69rem" }}>{row[c]}</span>
                      ) : (
                        <span style={{ color: "#3a5878" }}>{String(row[c] ?? "—")}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={cols.length}
                    style={{
                      textAlign: "center",
                      color: "#0e1a26",
                      padding: "50px",
                      ...mono,
                      fontSize: "0.72rem",
                    }}
                  >
                    No {type} found{filter ? ` matching "${filter}"` : ""}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {ctxMenu && (
        <div
          style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
            background: "#0a1420",
            border: "1px solid #1e3a52",
            borderRadius: 5,
            padding: "4px 0",
            zIndex: 9999,
            minWidth: 160,
            ...mono,
            fontSize: "0.72rem",
          }}
        >
          {[
            { label: "Copy Name", fn: () => navigator.clipboard.writeText(ctxMenu.row.name) },
            { label: "Copy Namespace", fn: () => navigator.clipboard.writeText(ctxMenu.row.namespace) },
            { label: `Copy ${kind}/name`, fn: () => navigator.clipboard.writeText(`${kind}/${ctxMenu.row.name}`) },
            { label: "Delete", color: "#ff4d4d", fn: handleCtxDelete },
          ].map(({ label, fn, color }) => (
            <div
              key={label}
              onClick={() => ctxAction(fn)}
              style={{
                padding: "6px 16px",
                color: color || "#bcc",
                cursor: "pointer",
                transition: "background 0.07s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#152238"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {label}
            </div>
          ))}
        </div>
      )}
      {delConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
          }}
          onClick={() => setDelConfirm(null)}
        >
          <div
            style={{
              background: "#0a1420",
              border: "1px solid #ff4d4d40",
              borderRadius: 8,
              padding: 20,
              minWidth: 300,
              maxWidth: 400,
              ...mono,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Trash2 size={16} color="#ff4d4d" />
              <span style={{ color: "#ff4d4d", fontWeight: 700, fontSize: "0.8rem" }}>
                Delete {kind}/{delConfirm.name}?
              </span>
            </div>
            {delConfirm.namespace && (
              <div style={{ fontSize: "0.67rem", color: "#667", marginBottom: 14 }}>
                Namespace: {delConfirm.namespace}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setDelConfirm(null)}
                style={{ background: "transparent", border: "1px solid #667", borderRadius: 4, color: "#667", padding: "4px 12px", ...mono, fontSize: "0.67rem", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(delConfirm)}
                style={{ background: "#ff4d4d20", border: "1px solid #ff4d4d", borderRadius: 4, color: "#ff4d4d", padding: "4px 12px", ...mono, fontSize: "0.67rem", cursor: "pointer" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
