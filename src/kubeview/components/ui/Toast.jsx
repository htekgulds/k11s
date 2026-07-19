import { useState, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

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
    <div className={cn("fixed bottom-15 right-5 z-[9999] flex flex-col gap-2 pointer-events-none")}>
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
    success: { bg: "bg-[#0a2a10]", border: "border-[#1a5a20]", text: "text-[#39ff8a]" },
    warning: { bg: "bg-[#2a2008]", border: "border-[#5a4a10]", text: "text-[#f5c518]" },
    error: { bg: "bg-[#2a0808]", border: "border-[#5a1010]", text: "text-[#ff6b6b]" },
    info: { bg: "bg-[#08202a]", border: "border-[#104a5a]", text: "text-[#7dd3fc]" },
  };

  const c = colors[toast.type] || colors.info;

  return (
    <div
      className={cn(
        "rounded-md p-2 font-mono text-[0.72rem] flex items-center gap-2.5",
        "max-w-[400px] pointer-events-auto shadow-[0_4px_20px_rgba(0,0,0,0.4)]",
        "animate-fade-in",
        c.bg, c.border, c.text
      )}
    >
      <span className="flex-1 break-words">{toast.message}</span>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className={cn("p-0 opacity-60 hover:opacity-100 transition-opacity", c.text)}
      >
        <X size={14} />
      </button>
    </div>
  );
}