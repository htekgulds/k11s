import { X } from "lucide-react";
import { COMMON_RESOURCES } from "../../constants";
import { cn } from "../../utils/cn";

const shortcuts = [
  { key: "?", desc: "Toggle this shortcuts panel" },
  { key: "Cmd+K / :", desc: "Open command palette" },
  { key: "Esc", desc: "Close command palette / modals" },
  { key: "Cmd+W", desc: "Close active tab" },
  ...COMMON_RESOURCES.map((r) => ({ key: r.shortcut, desc: `Open ${r.label} list` })),
];

export function ShortcutsModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[10000] flex items-center justify-center",
        "bg-black/60"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "p-5 rounded-lg min-w-[320px] max-w-[420px] font-mono",
          "bg-[#0a1420] border border-[#0e1f2e]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-[14px]">
          <span className="text-[#bdd] font-bold text-[0.85rem]">
            Keyboard Shortcuts
          </span>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "p-1 cursor-pointer text-[#4a7a8a] hover:text-[#bdd]",
              "bg-none border-none flex items-center"
            )}
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex justify-between py-1 text-[0.72rem] font-mono"
            >
              <span className="text-[#889]">{s.desc}</span>
              <span className={cn(
                "px-[6px] py-[1px] rounded text-[0.65rem] font-mono",
                "bg-[#080e18] border border-[#1e3a52] text-[#bdd]"
              )}>
                {s.key}
              </span>
            </div>
          ))}
        </div>

        <div className={cn(
          "text-center mt-3 font-mono text-[0.62rem]",
          "text-[#2d4a6a]"
        )}>
          Press{" "}
          <span className={cn(
            "px-[6px] py-[1px] rounded text-[0.65rem] font-mono",
            "bg-[#080e18] border border-[#1e3a52] text-[#bdd]"
          )}>
            ?
          </span>{" "}
          or{" "}
          <span className={cn(
            "px-[6px] py-[1px] rounded text-[0.65rem] font-mono",
            "bg-[#080e18] border border-[#1e3a52] text-[#bdd]"
          )}>
            Cmd+/
          </span>{" "}
          to toggle
        </div>
      </div>
    </div>
  );
}