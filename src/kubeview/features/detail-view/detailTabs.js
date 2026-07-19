// Tab registry for DetailView - maps subTab key to tab configuration
import { InfoTab } from "./InfoTab";
import { MetricsTab } from "./MetricsTab";
import { LogsTab } from "./LogsTab";
import { ShellTab } from "./ShellTab";
import { YamlTab } from "./YamlTab";
import { EventsTab } from "./EventsTab";
import { DescribeTab } from "./DescribeTab";
import { ConfigDataTab } from "./ConfigDataTab";
import { IngressRulesTab } from "./IngressRulesTab";
import { GraphTab } from "./GraphTab";

export const DETAIL_TABS = {
  info: {
    label: "Info",
    component: InfoTab,
    required: true,
    getProps: (tabData) => ({ obj: tabData.obj, type: tabData.type, related: tabData.related, onNavigate: tabData.onNavigate }),
  },
  metrics: {
    label: "Metrics",
    component: MetricsTab,
    required: false,
    getProps: (tabData) => ({ obj: tabData.obj, clusterId: tabData.clusterId }),
  },
  logs: {
    label: "Logs",
    component: LogsTab,
    required: false,
    getProps: (tabData) => ({ obj: tabData.obj, clusterId: tabData.clusterId }),
  },
  shell: {
    label: "Shell",
    component: ShellTab,
    required: false,
    getProps: (tabData) => ({ obj: tabData.obj, clusterId: tabData.clusterId }),
  },
  yaml: {
    label: "YAML",
    component: YamlTab,
    required: false,
    getProps: (tabData) => ({ obj: tabData.obj, type: tabData.type, clusterId: tabData.clusterId }),
  },
  events: {
    label: "Events",
    component: EventsTab,
    required: false,
    getProps: (tabData) => ({ obj: tabData.obj, clusterId: tabData.clusterId }),
  },
  describe: {
    label: "Describe",
    component: DescribeTab,
    required: false,
    getProps: (tabData) => ({ obj: tabData.obj, clusterId: tabData.clusterId }),
  },
  data: {
    label: "Data",
    component: ConfigDataTab,
    required: false,
    getProps: (tabData) => ({
      kind: tabData.type,
      name: tabData.obj.name,
      namespace: tabData.obj.namespace,
      clusterId: tabData.clusterId,
    }),
  },
  rules: {
    label: "Rules",
    component: IngressRulesTab,
    required: false,
    getProps: (tabData) => ({ clusterId: tabData.clusterId }),
  },
  graph: {
    label: "Graph",
    component: GraphTab,
    required: false,
    getProps: (tabData) => ({ graph: tabData.graph, allData: tabData.allData, onNavigate: tabData.onNavigate }),
  },
};

// Which tabs are available for each resource type
export const DETAIL_TABS_MAP = {
  pods: ["info", "metrics", "logs", "shell", "yaml", "events", "describe", "graph"],
  deployments: ["info", "yaml", "events", "describe", "graph"],
  statefulsets: ["info", "yaml", "events", "describe", "graph"],
  services: ["info", "yaml", "describe", "graph"],
  nodes: ["info", "yaml", "events", "describe", "graph"],
  configmaps: ["info", "data", "yaml", "describe", "graph"],
  secrets: ["info", "data", "yaml", "describe", "graph"],
  ingresses: ["info", "rules", "yaml", "describe", "graph"],
  pvcs: ["info", "yaml", "describe", "graph"],
  daemonsets: ["info", "yaml", "events", "describe", "graph"],
  cronjobs: ["info", "yaml", "events", "describe", "graph"],
  jobs: ["info", "yaml", "events", "describe", "graph"],
  hpas: ["info", "yaml", "describe", "graph"],
  helm: [],
  default: ["info", "yaml", "graph"],
};

export function getAvailableTabs(type) {
  return DETAIL_TABS_MAP[type] || DETAIL_TABS_MAP.default;
}

export function getTabComponent(key) {
  return DETAIL_TABS[key]?.component || null;
}

export function getTabProps(key, tabData) {
  const tab = DETAIL_TABS[key];
  return tab?.getProps ? tab.getProps(tabData) : {};
}