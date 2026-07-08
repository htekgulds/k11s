import { ScrollText, Terminal, ArrowUpDown, RefreshCw, Edit, Trash2, AlertTriangle, Copy, ClipboardCopy } from "lucide-react";
import { RESOURCE_TYPES } from "../constants";
import { STATUS_COLOR, mono } from "../theme";
import { nsColor } from "../utils/colors";
import { Pill } from "./ui/Pill";
import { useState } from "react";

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
  const [showShellPicker, setShowShellPicker] = useState(false);
  const isErr = ["CrashLoopBackOff", "Error", "OOMKilled", "NotReady"].includes(obj.status);
  const statCol = STATUS_COLOR[obj.status] || "#556";
  const kindLbl = RESOURCE_TYPES.find((r) => r.key === type)?.label.replace(/s$/, "") || type;

  const containers = obj?.containers || [];
  const multiContainer = containers.length > 1;

  const actions = [
    ...(type === "pods"
      ? [
          { label: "Logs", icon: <ScrollText size={14} />, color: "#fde68a", fn: () => onGoTab("logs") },
          {
            label: "Shell",
            icon: <Terminal size={14} />,
            color: "#c4b5fd",
            fn: () =>
              multiContainer
                ? setShowShellPicker(true)
                : alert(`kubectl exec -it ${obj.name} -n ${obj.namespace} -- sh`),
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

      {showShellPicker && (
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
          onClick={() => setShowShellPicker(false)}
        >
          <div
            style={{
              background: "#0a1018",
              border: "1px solid #c4b5fd40",
              borderRadius: 8,
              padding: 20,
              minWidth: 300,
              ...mono,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Terminal size={18} color="#c4b5fd" />
              <span style={{ color: "#c4b5fd", fontWeight: 700, fontSize: "0.85rem" }}>
                Open Shell
              </span>
            </div>

            <div style={{ marginBottom: 14, fontSize: "0.72rem", lineHeight: "1.6" }}>
              <span style={{ color: "#889" }}>Pod: </span>
              <span style={{ color: "#bcc", fontWeight: 600 }}>{obj.name}</span>
              {obj.namespace && (
                <>
                  <br />
                  <span style={{ color: "#889" }}>Namespace: </span>
                  <span style={{ color: nsColor(obj.namespace) }}>{obj.namespace}</span>
                </>
              )}
            </div>

            <div style={{ color: "#667", fontSize: "0.62rem", marginBottom: 12 }}>
              Select container to open a shell:
            </div>

            {containers.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `kubectl exec -it ${obj.name} -c ${c} -n ${obj.namespace} -- sh`,
                  );
                  setShowShellPicker(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  background: "#080e18",
                  border: "1px solid #1e3a52",
                  borderRadius: 4,
                  color: "#bcc",
                  cursor: "pointer",
                  padding: "6px 10px",
                  ...mono,
                  fontSize: "0.72rem",
                  marginBottom: 5,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#0e1f2e"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#080e18"; }}
              >
                {c}
                <span style={{ color: "#667", fontSize: "0.62rem", marginLeft: 8 }}>
                  copy command
                </span>
              </button>
            ))}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowShellPicker(false)}
                style={{
                  background: "transparent",
                  border: "1px solid #66728",
                  borderRadius: 4,
                  color: "#667",
                  cursor: "pointer",
                  padding: "4px 9px",
                  ...mono,
                  fontSize: "0.67rem",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
