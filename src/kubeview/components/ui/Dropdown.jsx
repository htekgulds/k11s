import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "../../utils/cn";

export function Dropdown({ value, options, onChange, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const handleClickOutside = useCallback((e) => {
    if (ref.current && !ref.current.contains(e.target)) setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1 rounded",
          "bg-[#080e18] border border-[#0e1f2e] text-[#7dd3fc]",
          "text-[0.68rem] font-mono outline-none cursor-pointer",
          "hover:bg-[#0a1420] transition-colors whitespace-nowrap"
        )}
      >
        <span className="truncate flex-1">{value}</span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[1rem] text-[#1e3a52]">▾</span>
      </button>
      {open && (
        <div className={cn(
          "absolute top-full left-0 right-0 z-[100] mt-1 rounded",
          "bg-[#0a1420] border border-[#0e1f2e] max-h-[200px] overflow-y-auto"
        )}>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={cn(
                "w-full text-left px-2 py-1 font-mono text-[0.68rem] cursor-pointer",
                "hover:bg-[#0a1828] transition-colors",
                opt === value
                  ? "bg-[#0e1f2e] text-[#7dd3fc]"
                  : "text-[#3a5878]"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}