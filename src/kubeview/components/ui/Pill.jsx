import { cn } from "../../utils/cn";

export function Pill({ label, color }) {
  return (
    <span
      className={cn(
        "inline-block px-1.5 rounded text-[0.68rem] font-mono font-bold tracking-[0.03em]",
        "bg-[color:var(--color)]/8 border border-[color:var(--color)]/25 text-[color:var(--color)]"
      )}
      style={{ "--color": color }}
    >
      {label}
    </span>
  );
}