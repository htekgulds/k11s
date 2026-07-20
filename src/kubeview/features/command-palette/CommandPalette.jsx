import { useCallback, useEffect, useRef, useState } from "react";
import { Command } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "../../utils/cn";

export function CommandPalette({ open, query, setQuery, items, onClose, inputRef, stale }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const visible = items.filter((i) => !i.separator).slice(0, 10);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) setSelectedIndex(0);
  }, [open]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useHotkeys("down", () => setSelectedIndex((i) => Math.min(i + 1, visible.length - 1)), { enableOnFormTags: true, enabled: open, preventDefault: true }, [visible.length, open]);
  useHotkeys("up", () => setSelectedIndex((i) => Math.max(i - 1, 0)), { enableOnFormTags: true, enabled: open, preventDefault: true }, [open]);
  useHotkeys("enter", () => {
    const item = visible[selectedIndex];
    if (item) { item.fn(); onClose(); }
  }, { enableOnFormTags: true, enabled: open }, [visible, selectedIndex, onClose, open]);

  const runItem = useCallback((item) => {
    item.fn();
    onClose();
  }, [onClose]);

  if (!open) return null;

  let renderIdx = 0;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[2000] flex items-start justify-center pt-[13vh]",
        "bg-black/82 animate-[fadeIn_0.13s_ease]"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "w-[min(520px,90vw)] rounded-lg overflow-hidden",
          "bg-[#0a0f18] border border-[#0e1f2e]",
          "shadow-[0_24px_64px_rgba(0,0,0,0.95)] animate-[fadeIn_0.13s_ease]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-[9px] px-[14px] py-[10px] border-b border-[#0a1420]">
          <Command size={16} className="text-[#39ff8a] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search resources, open resource view, switch cluster…"
            className={cn(
              "flex-1 bg-none border-none outline-none font-mono text-[0.82rem] text-[#dde]",
              "placeholder:text-[#4a7a8a]"
            )}
          />
          {stale && <span className="text-[0.62rem] font-mono text-[#ffd70066]">⌛</span>}
          <span className="text-[0.67rem] text-[#0e1f2e] font-mono">ESC</span>
        </div>
        <div ref={listRef} className="max-h-[320px] overflow-y-auto">
          {items.map((item, i) => {
            if (item.separator) {
              return (
                <div
                  key={`sep-${i}`}
                  className="h-px bg-[#0e1f2e] mx-[14px] my-1"
                />
              );
            }
            const idx = renderIdx++;
            const leftColor = item.clusterColor || null;
            const isSelected = selectedIndex === idx;

            return (
              <button
                key={i}
                type="button"
                onClick={() => runItem(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={cn(
                  "flex items-center gap-2 w-full text-left px-[14px] py-[9px] font-mono text-[0.75rem] cursor-pointer",
                  "border-b border-[#080e18] transition-colors",
                  isSelected
                    ? "bg-[#0a1420] text-[#c8d6e5]"
                    : "bg-transparent text-[#4a7a8a] hover:bg-[#0a1420] hover:text-[#c8d6e5]"
                )}
              >
                {leftColor && (
                  <span
                    className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                    style={{ background: leftColor }}
                  />
                )}
                <span className="truncate flex-1 min-w-0 overflow-hidden">
                  {item.label}
                </span>
              </button>
            );
          })}
          {!items.length && (
            <div className="px-[14px] py-[18px] font-mono text-[0.72rem] text-[#0e1f2e]">
              No match
            </div>
          )}
        </div>
      </div>
    </div>
  );
}