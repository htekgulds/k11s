import { getAvailableTabs } from "./detailTabs";
import { cn } from "../../utils/cn";

export function DetailTabs({ type, subTab, onGoTab }) {
  const dtabs = getAvailableTabs(type);

  return (
    <div className="flex">
      {dtabs.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onGoTab(t)}
          className={cn(
            "px-[13px] py-[5px] font-mono text-[0.69rem] uppercase tracking-[0.07em] cursor-pointer",
            "border-none bg-transparent border-b-2 transition-colors",
            subTab === t
              ? "border-[#39ff8a] text-[#dde] font-bold"
              : "border-transparent text-[#2d4a6a] font-normal hover:text-[#556] hover:border-[#1a3a4a]"
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}