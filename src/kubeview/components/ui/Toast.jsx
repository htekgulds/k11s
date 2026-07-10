import { useState, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";

let toastId = 0;

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 3000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export function ToastContainer({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 60,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, toast.duration, onRemove]);

  const colors = {
    success: { bg: "#0a2a10", border: "#1a5a20", text: "#39ff8a" },
    warning: { bg: "#2a2008", border: "#5a4a10", text: "#f5c518" },
    error: { bg: "#2a0808", border: "#5a1010", text: "#ff6b6b" },
    info: { bg: "#08202a", border: "#104a5a", text: "#7dd3fc" },
  };

  const c = colors[toast.type] || colors.info;

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        color: c.text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.72rem",
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 400,
        pointerEvents: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        animation: "toastIn 0.2s ease-out",
      }}
    >
      <span style={{ flex: 1, wordBreak: "break-word" }}>{toast.message}</span>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        style={{
          background: "none",
          border: "none",
          color: c.text,
          cursor: "pointer",
          opacity: 0.6,
          padding: 0,
          display: "flex",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
