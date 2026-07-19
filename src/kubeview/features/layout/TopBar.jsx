import { useEffect, useRef } from "react";
import { Hexagon, X, Command } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { cn } from "../../utils/cn";
import { ClusterDropdown } from "./ClusterDropdown";
import { NamespaceSwitcher } from "./NamespaceSwitcher";

export function TopBar({
  clusters,
  activeCluster,
  onSwitchCluster,
  clusterState,
  onTabClick,
  onCloseTab,
  onOpenPalette,
  clock,
  activeNamespace,
  onNamespaceChange,
  data,
  showFilter,
  filterValue,
  onFilterChange,
}) {
  const detailTabs = clusterState.tabs.filter((t) => t.type === "detail");
  const scrollRef = useRef(null);
  const filterRef = useRef(null);

  useHotkeys("/", () => filterRef.current?.focus(), { preventDefault: true, enableOnFormTags: true }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [clusterState.tabs.length]);

  return (
    <div className={cn(
      "flex items-center h-[38px] flex-shrink-0 min-w-0",
      "bg-[#030710] border-b border-[#080e18]"
    )}>
      <div className={cn(
        "w-[142px] px-3 border-r border-[#080e18] h-full flex items-center flex-shrink-0"
      )}>
        <span className={cn(
          "font-rajdhani font-bold text-[1rem] tracking-[0.15em] flex items-center gap-1",
          "text-[#39ff8a]"
        )}>
          <Hexagon size={18} style={{ verticalAlign: "middle" }} /> k11s
        </span>
      </div>
      <ClusterDropdown
        clusters={clusters}
        activeCluster={activeCluster}
        onSwitch={onSwitchCluster}
      />
      <NamespaceSwitcher
        activeNamespace={activeNamespace}
        onNamespaceChange={onNamespaceChange}
        data={data}
      />

      {/* Contextual filter — only when a resource list is active */}
      {showFilter && (
        <div className="flex items-center gap-1.5 px-2.5 flex-shrink-0">
          <input
            ref={filterRef}
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder="filter…"
            className={cn(
              "px-2 py-0.5 rounded text-[0.68rem] font-mono outline-none w-[130px]",
              "bg-[#080e18] border border-[#0e1f2e] text-[#bcc]",
              "focus:border-[#39ff8a]"
            )}
            onKeyDown={(e) => { if (e.key === "Escape") onFilterChange(""); }}
          />
          {filterValue && (
            <button
              type="button"
              onClick={() => onFilterChange("")}
              className={cn(
                "text-[0.7rem] cursor-pointer p-0",
                "text-[#1e3a52] hover:text-[#39ff8a]"
              )}
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onWheel={(e) => { scrollRef.current.scrollLeft += e.deltaY; }}
        className="flex-1 overflow-x-auto overflow-y-hidden h-full min-w-0 flex"
      >
        {detailTabs.map((tab) => {
          const isAct = clusterState.activeTab === tab.id;
          const tabErr = tab.tabErr;
          const tabColor = tab.color || "#39ff8a";

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabClick(tab.id)}
              onMouseDown={(e) => { if (e.button === 1) onCloseTab(tab.id, e); }}
              className={cn(
                "flex items-center gap-1.25 px-3 h-full flex-shrink-0 max-w-[180px]",
                "font-mono text-[0.7rem] whitespace-nowrap transition-all",
                "border-b-2 border-r border-[#080e18]",
                isAct
                  ? `bg-[#060a10] border-b-[${tabColor}] text-[#ccd]`
                  : `border-transparent text-[${tabErr ? "#ff5555" : "#2d4a6a"}] hover:bg-[#060c14]`
              )}
            >
              <span
                className={cn(
                  "w-1.25 h-1.25 rounded-full flex-shrink-0",
                  "opacity-65",
                  isAct && "opacity-100"
                )}
                style={{ background: tabColor }}
              />

              <span className="overflow-hidden text-ellipsis flex-1">
                {tab.namespace ? (
                  <>
                    <span className={cn(isAct ? "text-[#4a7a8a]" : "text-[#1e3a52]")}>
                      {tab.namespace}/
                    </span>
                    <span>{tab.name.length > 20 ? `${tab.name.slice(0, 18)}…` : tab.name}</span>
                  </>
                ) : (
                  tab.label
                )}
              </span>
              {tabErr && (
                <span className={cn(
                  "w-1 h-1 rounded-full flex-shrink-0 animate-pulse",
                  "bg-[#ff4d4d]"
                )} />
              )}
              <span
                role="presentation"
                onClick={(e) => onCloseTab(tab.id, e)}
                className={cn(
                  "text-[0.85rem] ml-1 flex-shrink-0 rounded",
                  "text-[#0e1f2e] hover:text-[#ff4d4d] hover:bg-[#ff4d4d]/12",
                  "transition-all p-[0_3px]"
                )}
              >
                <X size={14} />
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 px-3 flex-shrink-0">
        <button
          type="button"
          onClick={onOpenPalette}
          className={cn(
            "px-2 py-0.5 rounded text-[0.67rem] font-mono cursor-pointer",
            "bg-[#0a1018] border border-[#0e1f2e] text-[#1e3a52]",
            "hover:bg-[#0a1420] hover:border-[#1a3a4a] hover:text-[#39ff8a]"
          )}
        >
          <Command size={14} />K
        </button>
        <span className={cn("font-mono text-[0.67rem]", "text-[#0e1f2e]")}>
          {clock.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}