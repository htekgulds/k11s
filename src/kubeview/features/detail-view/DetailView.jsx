import { useState, useMemo } from "react";
import { buildGraph, getRelated } from "../../utils/graph";
import { DetailHeader } from "./DetailHeader";
import { DetailTabs } from "./DetailTabs";
import { getAvailableTabs, getTabComponent, getTabProps } from "./detailTabs";
import { cn } from "../../utils/cn";

export function DetailView({ obj, type, allData, clusterId, onNavigate }) {
  const [subTab, setSubTab] = useState("info");

  const graph = useMemo(() => buildGraph(obj, type, allData), [obj, type, allData]);
  const related = useMemo(() => getRelated(obj, type, allData), [obj, type, allData]);

  const goTab = (tab) => setSubTab(tab);

  // Prepare shared tab data
  const tabData = useMemo(() => ({
    obj,
    type,
    allData,
    clusterId,
    graph,
    related,
    onNavigate,
  }), [obj, type, allData, clusterId, graph, related, onNavigate]);

  const availableTabs = getAvailableTabs(type);
  const activeTabKey = availableTabs.includes(subTab) ? subTab : availableTabs[0] || "info";
  const TabComponent = getTabComponent(activeTabKey);

  if (!TabComponent) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", "text-[#0e1f2e]")}>
        No detail view for this resource type
      </div>
    );
  }

  const tabProps = getTabProps(activeTabKey, tabData);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={cn(
        "p-[12px_16px_0] flex-shrink-0",
        "bg-[#050910] border-b border-[#0a1018]"
      )}>
        <DetailHeader obj={obj} type={type} clusterId={clusterId} onGoTab={goTab} />
        <DetailTabs type={type} subTab={activeTabKey} onGoTab={goTab} />
      </div>
      <div className={cn("flex-1 overflow-hidden flex min-h-0")}>
        <TabComponent {...tabProps} />
      </div>
    </div>
  );
}