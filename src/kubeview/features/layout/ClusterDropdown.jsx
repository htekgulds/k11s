import { useState, useEffect, useRef } from "react";
import { cn } from "../../utils/cn";
import { ENV_STYLE } from "../../theme";

export function ClusterDropdown({ clusters, activeCluster, onSwitch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const envStyle = ENV_STYLE[activeCluster?.env] || ENV_STYLE.dev;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!activeCluster) return null;

  return (
    <div ref={ref} className="relative h-full flex items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-[7px] h-full px-[12px] border-r border-[#080e18]",
          "cursor-pointer font-mono text-[0.7rem] whitespace-nowrap transition-colors",
          open ? "bg-[#080e18]" : "hover:bg-[#060c14]"
        )}
      >
        <span
          className="w-[7px] h-[7px] rounded-full flex-shrink-0 animate-[pulse_2.5s_infinite]"
          style={{
            background: activeCluster.color,
            boxShadow: `0 0 6px ${activeCluster.color}88`,
          }}
        />
        <span className="text-[#dde] font-bold">{activeCluster.label}</span>
        <span className={cn(
          "px-[5px] rounded text-[0.62rem] font-mono",
          `bg-[${envStyle.bg}] border border-[${envStyle.border}] text-[${envStyle.text}]`
        )}>
          {activeCluster.env}
        </span>
        <span className="text-[1rem] text-[#2d4a6a] ml-[2px]">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className={cn(
          "absolute top-full left-0 z-[1000] mt-1 min-w-[220px]",
          "bg-[#0a0f18] border border-[#0e1f2e] rounded-lg",
          "shadow-[0_12px_32px_rgba(0,0,0,0.85)] overflow-hidden",
          "animate-[fadeIn_0.1s_ease]"
        )}>
          <div className={cn(
            "px-[10px] py-[6px] border-b border-[#080e18]",
            "font-mono text-[0.57rem] uppercase tracking-[0.1em] text-[#1e3a52]"
          )}>
            Switch cluster
          </div>
          {clusters.map((cl) => {
            const es = ENV_STYLE[cl.env] || ENV_STYLE.dev;
            const isActive = cl.id === activeCluster.id;
            return (
              <button
                key={cl.id}
                type="button"
                onClick={() => { onSwitch(cl.id); setOpen(false); }}
                className={cn(
                  "flex items-center gap-[8px] w-full px-[10px] py-[8px] text-left",
                  "font-mono text-[0.7rem] cursor-pointer transition-colors",
                  isActive ? "bg-[#080e18]" : "hover:bg-[#060c14]",
                  "border-none border-l-2",
                  isActive ? `border-l-[${cl.color}]` : "border-transparent"
                )}
              >
                <span
                  className="w-[7px] h-[7px] rounded-full flex-shrink-0"
                  style={{
                    background: cl.color,
                    boxShadow: `0 0 6px ${cl.color}88`,
                  }}
                />
                <span className="truncate flex-1 text-[#dde]">{cl.label}</span>
                <span className={cn(
                  "px-[5px] rounded text-[0.62rem] font-mono flex-shrink-0",
                  `bg-[${es.bg}] border border-[${es.border}] text-[${es.text}]`
                )}>
                  {cl.env}
                </span>
                {isActive && <span className="text-[1rem] text-[#39ff8a] ml-auto">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}