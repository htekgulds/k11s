import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { COLUMNS, getColumns, DEFAULT_COLUMNS } from "../../constants";
import { mono } from "../../theme";
import { nsColor } from "../../utils/colors";
import { Pill } from "../../components/ui/Pill";
import { Spinner } from "../../components/ui/Spinner";
import { StatusDot } from "../../components/ui/StatusDot";
import { deleteResource } from "../../api";
import { CreateCronJobModal } from "./CreateCronJobModal";
import { CreateJobModal } from "./CreateJobModal";
import { cn } from "../../utils/cn";

const columnHelper = createColumnHelper();

// Persistence keys
const getStorageKeys = (type) => ({
  visibility: `k11s_cols_${type}`,
  order: `k11s_order_${type}`,
  sizing: `k11s_colw_${type}`,
});

// Load persisted state
const loadPersisted = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

// Persist state to localStorage
const persist = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
};

// Custom cell renderers
const CellRenderers = {
  status: (value) => <StatusDot status={value} />,
  namespace: (value) => <span className={cn("text-[0.71rem]", nsColor(value))}>{value}</span>,
  restarts: (value) => {
    if (value > 5) return <span className="text-[#ff4d4d] font-bold">{value}</span>;
    if (value > 0) return <span className="text-[#f5c518]">{value}</span>;
    return <span>{value ?? "—"}</span>;
  },
  ready: (value) => value?.startsWith("0")
    ? <span className="text-[#ff4d4d]">{value}</span>
    : <span>{value ?? "—"}</span>,
  name: (value) => <span className="text-[#ccd] font-semibold">{value ?? "—"}</span>,
  type: (value) => value === "LoadBalancer"
    ? <Pill label={value} color="#39ff8a" />
    : <span className="text-[#3a5878]">{value ?? "—"}</span>,
  external_ip: (value) => value !== "<none>"
    ? <span className="text-[#f5c518]">{value}</span>
    : <span className="text-[#3a5878]">{value ?? "—"}</span>,
  image: (value) => <span className="text-[#7a6aaa] text-[0.69rem]">{value ?? "—"}</span>,
  default: (value) => <span className="text-[#3a5878]">{String(value ?? "—")}</span>,
};

// Build column definitions for react-table
const buildTableColumns = (type) => {
  const colDefs = getColumns(type);
  return colDefs.map((col) => {
    const id = col.id || col;
    const header = col.header || id.replace(/_/g, " ");
    const renderer = CellRenderers[id] || CellRenderers.default;

    return columnHelper.accessor(id, {
      id,
      header,
      cell: (info) => renderer(info.getValue(), info.row.original),
      enableSorting: true,
      enableResizing: true,
      enableHiding: true,
      size: 120,
      minSize: 60,
      maxSize: 400,
    });
  });
};

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
  const storageKeys = getStorageKeys(type);
  const allCols = getColumns(type).map(c => c.id || c);
  const tableColumns = useMemo(() => buildTableColumns(type), [type]);

  // State with persistence
  const [sorting, setSorting] = useState(() => loadPersisted(storageKeys.order, []));
  const [columnVisibility, setColumnVisibility] = useState(() =>
    loadPersisted(storageKeys.visibility, allCols.reduce((acc, c) => ({ ...acc, [c]: true }), {}))
  );
  const [columnOrder, setColumnOrder] = useState(() =>
    loadPersisted(storageKeys.order, null)
  );
  const [columnSizing, setColumnSizing] = useState(() =>
    loadPersisted(storageKeys.sizing, {})
  );
  const [showColPicker, setShowColPicker] = useState(false);
  const colPickerRef = useRef(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);

  // Persist changes
  useEffect(() => persist(storageKeys.order, sorting), [sorting, storageKeys.order]);
  useEffect(() => persist(storageKeys.visibility, columnVisibility), [columnVisibility, storageKeys.visibility]);
  useEffect(() => persist(storageKeys.sizing, columnSizing), [columnSizing, storageKeys.sizing]);
  useEffect(() => persist(storageKeys.order, columnOrder), [columnOrder, storageKeys.order]);

  // Sync with allCols changes (type switch)
  useEffect(() => {
    setColumnVisibility((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (!allCols.includes(k)) delete next[k]; });
      allCols.forEach((c) => { if (next[c] === undefined) next[c] = true; });
      return next;
    });
    setColumnOrder((prev) => prev ? prev.filter((c) => allCols.includes(c)) : null);
  }, [allCols]);

  // Filter rows
  const filteredData = useMemo(() => {
    return data.filter((r) => {
      const nsOk = !namespace || namespace === "All" || r.namespace === namespace || !r.namespace;
      const txOk = !filter || Object.values(r).some((v) => String(v).toLowerCase().includes(filter.toLowerCase()));
      return nsOk && txOk;
    });
  }, [data, filter, namespace]);

  // Create the table
  const table = useReactTable({
    data: filteredData,
    columns: tableColumns,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnSizing,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualFiltering: true,
    manualSorting: true,
  });

  // Context menu handlers
  const handleCtxDelete = useCallback(() => {
    const row = ctxMenu?.row;
    if (!row || !clusterId) return;
    setCtxMenu(null);
    setDelConfirm(row);
  }, [ctxMenu, clusterId]);

  const confirmDelete = useCallback(async (row) => {
    setDelConfirm(null);
    try {
      await deleteResource(clusterId, type, row.name, row.namespace || "", null, false);
      onRefresh();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  }, [clusterId, type, onRefresh]);

  // Click outside handlers
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [ctxMenu]);

  useEffect(() => {
    if (!showColPicker) return;
    const close = (e) => {
      if (colPickerRef.current && !colPickerRef.current.contains(e.target)) setShowColPicker(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [showColPicker]);

  const kind = type.replace(/s$/, "");

  if (loading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center gap-2", mono, "text-[#39ff8a]")}>
        <Spinner /> Loading {type}…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-1 bg-[#050910] border-b border-[#080e18] flex-shrink-0",
        mono, "text-[0.62rem] text-[#1e3a52]"
      )}>
        <span>{(data || []).length} items</span>

        {/* Column picker */}
        <div className="relative ml-1" ref={colPickerRef}>
          <button
            type="button"
            onClick={() => setShowColPicker((v) => !v)}
            title="Toggle columns"
            className={cn(
              "px-2 py-1 rounded border text-[0.67rem] cursor-pointer",
              "bg-transparent border-[#0e1f2e] text-[#1e3a52]", mono
            )}
          >
            ☰ cols
          </button>
          {showColPicker && (
            <div className={cn(
              "absolute top-full left-0 mt-1 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.7)] z-50 min-w-[150px]",
              "bg-[#0a0f18] border border-[#0e1f2e] py-1"
            )}>
              {allCols.map((c) => (
                <label key={c} className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 cursor-pointer text-[0.72rem]",
                  "text-[#4a7a8a] select-none", mono
                )}>
                  <input
                    type="checkbox"
                    checked={columnVisibility[c]}
                    onChange={() => setColumnVisibility(v => ({ ...v, [c]: !v[c] }))}
                    className="accent-[#39ff8a]"
                  />
                  {c.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          {type === "cronjobs" && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              title="Create CronJob"
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded border text-[0.67rem] cursor-pointer", mono,
                "bg-transparent border-[#0e1f2e] text-[#39ff8a]"
              )}
            >
              <Plus size={12} /> create
            </button>
          )}
          {type === "jobs" && (
            <button
              type="button"
              onClick={() => setShowCreateJobModal(true)}
              title="Create Job"
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded border text-[0.67rem] cursor-pointer", mono,
                "bg-transparent border-[#0e1f2e] text-[#39ff8a]"
              )}
            >
              <Plus size={12} /> create
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded border text-[0.67rem] cursor-pointer", mono,
              "bg-transparent border-[#0e1f2e] text-[#39ff8a]"
            )}
          >
            {loading ? <Spinner size={10} /> : "↻"} refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className={cn("w-full border-collapse", mono, "text-[0.74rem]")}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className={cn(
                "sticky top-0 z-5", "bg-[#050910] border-b border-[#0a1018]"
              )}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    {...header.getHeaderProps({
                      style: { width: header.getSize() },
                    })}
                    className={cn(
                      "px-3 py-1.5 text-left font-bold text-[0.61rem] uppercase tracking-[0.09em]",
                      "text-[#1e3a52] border-b border-[#0a1018] cursor-pointer select-none whitespace-nowrap relative",
                      header.getIsSorted() && "text-[#39ff8a]"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.getIsSorted() ? (header.getSortDirection() === "asc" ? " ↑" : " ↓") : ""}
                    </div>
                    <div
                      {...header.getResizeProps()}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize"
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={table.getAllLeafColumns().length} className={cn(
                  "text-center py-20 text-[0.72rem]", mono, "text-[#0e1a26]"
                )}>
                  No {type} found{filter ? ` matching "${filter}"` : ""}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.original)}
                  onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); onMiddleClick?.(row.original); } }}
                  onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, row: row.original }); }}
                  className={cn(
                    "border-b border-[#060c14] cursor-pointer transition-colors",
                    "hover:bg-[#0a1420]"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn("px-3 py-1.5 whitespace-nowrap max-w-[260px] overflow-hidden text-ellipsis")}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <div
          className={cn(
            "fixed z-[9999] rounded-lg shadow-xl p-1 min-w-[160px]", mono, "text-[0.72rem]",
            "bg-[#0a1420] border border-[#1e3a52]"
          )}
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          {[
            { label: "Copy Name", fn: () => navigator.clipboard.writeText(ctxMenu.row.name) },
            { label: "Copy Namespace", fn: () => navigator.clipboard.writeText(ctxMenu.row.namespace) },
            { label: `Copy ${kind}/name`, fn: () => navigator.clipboard.writeText(`${kind}/${ctxMenu.row.name}`) },
            { label: "Delete", color: "#ff4d4d", fn: handleCtxDelete },
          ].map(({ label, fn, color }) => (
            <div
              key={label}
              onClick={() => { fn(); setCtxMenu(null); }}
              className={cn(
                "px-4 py-1.5 cursor-pointer transition-colors select-none",
                "hover:bg-[#152238]"
              )}
              style={{ color: color || "#bcc" }}
            >
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {delConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80">
          <div className={cn(
            "rounded-lg p-6 min-w-[320px] bg-[#0a0f18] border border-[#1e3a52] shadow-[0_24px_64px_rgba(0,0,0,0.95)]", mono
          )}>
            <p className="text-[#c8d6e5] mb-4">Delete {kind} <span className="text-[#39ff8a]">{delConfirm.name}</span>?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDelConfirm(null)}
                className={cn("px-3 py-1.5 rounded border text-[0.67rem] cursor-pointer", mono, "border-[#1a2030] text-[#4a7a8a] bg-transparent")}
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(delConfirm)}
                className={cn("px-3 py-1.5 rounded border text-[0.67rem] cursor-pointer", mono, "border-[#3a1a1a] text-[#ff6b6b] bg-[#0a1a0a]")}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateCronJobModal
          clusterId={clusterId}
          onClose={() => setShowCreateModal(false)}
          onCreated={onRefresh}
        />
      )}
      {showCreateJobModal && (
        <CreateJobModal
          clusterId={clusterId}
          onClose={() => setShowCreateJobModal(false)}
          onCreated={onRefresh}
        />
      )}
    </div>
  );
}