import { ScrollText, Terminal, ArrowUpDown, RefreshCw, Edit, Trash2, AlertTriangle, Copy, ClipboardCopy } from "lucide-react";
import { RESOURCE_TYPES } from "../constants";
import { STATUS_COLOR, mono } from "../theme";
import { nsColor } from "../utils/colors";
import { Pill } from "./ui/Pill";

const copyBtn = (txt, label) => (
  <button
    type="button"
    title={`Copy ${label}`}
    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(txt); }}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#1e3a52",
      padding: "1px 3px",
      borderRadius: 3,
      display: "inline-flex",
      alignItems: "center",
      opacity: 0.4,
      transition: "opacity 0.1s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
    onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.4"; }}
  >
    <Copy size={12} />
  </button>
);

export function DetailHeader({ obj, type, onGoTab }) {
  const isErr = ["CrashLoopBackOff", "Error", "OOMKilled", "NotReady"].includes(obj.status);
  const statCol = STATUS_COLOR[obj.status] || "#556";
  const kindLbl = RESOURCE_TYPES.find((r) => r.key === type)?.label.replace(/s$/, "") || type;

  const actions = [
    ...(type === "pods"
      ? [
          { label: "Logs", icon: <ScrollText size={14} />, color: "#fde68a", fn: () => onGoTab("logs") },
          {
            label: "Shell",
            icon: <Terminal size={14} />,
            color: "#c4b5fd",
            fn: () => alert(`kubectl exec -it ${obj.name} -n ${obj.namespace} -- sh`),
          },
        ]
      : []),
    ...(type === "deployments" || type === "statefulsets"
      ? [
          { label: "Scale", icon: <ArrowUpDown size={14} />, color: "#f9a8d4", fn: () => alert("Scale") },
          { label: "Redeploy", icon: <RefreshCw size={14} />, color: "#67e8f9", fn: () => alert("Restart") },
        ]
      : []),
    { label: "Edit YAML", icon: <Edit size={14} />, color: "#fb923c", fn: () => onGoTab("yaml") },
    { label: "Delete", icon: <Trash2 size={14} />, color: "#ff4d4d", fn: () => alert(`Delete ${obj.name}`) },
  ];

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 11 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ ...mono, fontWeight: 700, fontSize: "0.92rem", color: "#dde", wordBreak: "break-all" }}>
            {obj.name}
          </span>
          {copyBtn(obj.name, "name")}
          {obj.namespace && copyBtn(`${obj.namespace}/${obj.name}`, "namespace/name")}
          <Pill label={kindLbl} color={statCol} />
          {isErr && <Pill label={<span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><AlertTriangle size={12} /> degraded</span>} color="#ff4d4d" />}
        </div>
        <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
          {obj.namespace && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: "0.67rem", color: nsColor(obj.namespace), ...mono }}>
                ns/{obj.namespace}
              </span>
              {copyBtn(obj.namespace, "namespace")}
            </span>
          )}
          {obj.age && (
            <span style={{ fontSize: "0.67rem", color: "#1e3a52", ...mono }}>age/{obj.age}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flexShrink: 0 }}>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.fn}
            style={{
              background: "#0a1018",
              border: `1px solid ${a.color}28`,
              borderRadius: 4,
              color: a.color,
              cursor: "pointer",
              padding: "4px 9px",
              ...mono,
              fontSize: "0.67rem",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${a.color}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0a1018";
            }}
          >
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
