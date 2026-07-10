import { useState } from "react";
import { buildGraph, getRelated } from "../utils/graph";
import { InfoTab } from "./InfoTab";
import { LogsTab } from "./LogsTab";
import { ShellTab } from "./ShellTab";
import { YamlTab } from "./YamlTab";
import { EventsTab } from "./EventsTab";
import { DescribeTab } from "./DescribeTab";
import { GraphTab } from "./GraphTab";
import { DetailHeader } from "./DetailHeader";
import { DetailTabs } from "./DetailTabs";

export function DetailView({ obj, type, allData, clusterId, onNavigate }) {
  const [subTab, setSubTab] = useState("info");
  const graph = buildGraph(obj, type, allData);
  const related = getRelated(obj, type, allData);

  const goTab = (tab) => { setSubTab(tab); };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          padding: "12px 16px 0",
          background: "#050910",
          borderBottom: "1px solid #0a1018",
          flexShrink: 0,
        }}
      >
        <DetailHeader obj={obj} type={type} clusterId={clusterId} onGoTab={goTab} />
        <DetailTabs type={type} subTab={subTab} onGoTab={goTab} />
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", minHeight: 0 }}>
        {subTab === "info" && <InfoTab obj={obj} type={type} related={related} onNavigate={onNavigate} />}
        {subTab === "logs" && <LogsTab obj={obj} clusterId={clusterId} />}
        {subTab === "shell" && <ShellTab obj={obj} clusterId={clusterId} />}
        {subTab === "yaml" && <YamlTab obj={obj} type={type} clusterId={clusterId} />}
        {subTab === "events" && <EventsTab obj={obj} clusterId={clusterId} />}
        {subTab === "describe" && <DescribeTab obj={obj} clusterId={clusterId} />}
        {subTab === "graph" && <GraphTab graph={graph} allData={allData} onNavigate={onNavigate} />}
      </div>
    </div>
  );
}
