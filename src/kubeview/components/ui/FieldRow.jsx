import { cn } from "../../utils/cn";

export function FieldRow({ label, children, wide }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 pb-3 border-b border-[#0a1018]",
        "font-mono",
        wide && "col-span-full"
      )}
    >
      <span className={cn("text-[0.6rem] uppercase tracking-[0.1em] text-[#1e3a52]")}>
        {label}
      </span>
      <div className={cn("text-[0.77rem] text-[#bdd]")}>{children}</div>
    </div>
  );
}