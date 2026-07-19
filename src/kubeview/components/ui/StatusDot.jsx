import { cn } from "../../utils/cn";
import { STATUS_COLOR } from "../../theme";

export function StatusDot({ status }) {
  const c = STATUS_COLOR[status] || "#556";
  const pulse = status === "Running" || status === "Ready" || status === "Bound";

  return (
    <span className={cn("inline-flex items-center gap-1")}>
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          "shadow-[0_0_5px_]",
          pulse ? "animate-pulse" : ""
        )}
        style={{ background: c, boxShadow: `0 0 5px ${c}55` }}
      />
      <span className={cn("font-mono text-[0.77rem] font-bold", `text-[${c}]`)}>
        {status || "—"}
      </span>
    </span>
  );
}