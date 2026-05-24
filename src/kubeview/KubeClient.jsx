import { useCallback, useEffect, useRef, useState } from "react";
import { k8sInvoke, listClusters } from "./api";
import { defaultClusterState, RESOURCE_TYPES } from "./constants";
import { ClustersTab } from "./components/ClustersTab";
import { CommandPalette } from "./components/CommandPalette";
import { DetailView } from "./components/DetailView";
import { ResourceListTab } from "./components/ResourceListTab";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TopBar } from "./components/TopBar";
import { mono } from "./theme";

function detailTabsOnly(tabs) {
  return tabs.filter((t) => t.type === "detail");
}

export default function KubeClient() {
  const [clusters, setClusters] = useState([]);
  const [clustersError, setClustersError] = useState(null);
  const [activeClusterId, setActiveClusterId] = useState(null);
  const [clusterStates, setClusterStates] = useState({});
  const [clusterData, setClusterData] = useState({});
  const [clusterLoading, setClusterLoading] = useState({});
  const [tabFilters, setTabFilters] = useState({});
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [clock, setClock] = useState(() => new Date());
  const cmdRef = useRef(null);

  const rawCs = clusterStates[activeClusterId] || defaultClusterState();
  const cs = {
    ...rawCs,
    tabs: detailTabsOnly(rawCs.tabs),
    activeTab: rawCs.activeTab === "clusters" ? null : rawCs.activeTab,
  };
  const data = clusterData[activeClusterId] || {};
  const loading = clusterLoading[activeClusterId] || {};

  const setCS = useCallback(
    (upd) => {
      if (!activeClusterId) return;
      setClusterStates((prev) => ({
        ...prev,
        [activeClusterId]:
          typeof upd === "function" ? upd(prev[activeClusterId] || defaultClusterState()) : { ...cs, ...upd },
      }));
    },
    [activeClusterId, cs],
  );

  const setTabs = useCallback((u) => setCS((s) => ({ ...s, tabs: typeof u === "function" ? u(s.tabs) : u })), [setCS]);
  const setActiveTab = useCallback(
    (u) => setCS((s) => ({ ...s, activeTab: typeof u === "function" ? u(s.activeTab) : u })),
    [setCS],
  );

  const fetchResource = useCallback(async (type, cid) => {
    const clusterId = cid || activeClusterId;
    if (!clusterId) return;
    const rt = RESOURCE_TYPES.find((r) => r.key === type);
    if (!rt) return;
    setClusterLoading((prev) => ({
      ...prev,
      [clusterId]: { ...(prev[clusterId] || {}), [type]: true },
    }));
    try {
      const res = await k8sInvoke(rt.cmd, {}, clusterId);
      setClusterData((prev) => ({
        ...prev,
        [clusterId]: { ...(prev[clusterId] || {}), [type]: Array.isArray(res) ? res : [] },
      }));
    } catch (err) {
      console.error(`Failed to fetch ${type}:`, err);
      setClusterData((prev) => ({
        ...prev,
        [clusterId]: { ...(prev[clusterId] || {}), [type]: [] },
      }));
    } finally {
      setClusterLoading((prev) => ({
        ...prev,
        [clusterId]: { ...(prev[clusterId] || {}), [type]: false },
      }));
    }
  }, [activeClusterId]);

  useEffect(() => {
    listClusters()
      .then((list) => {
        setClusters(list);
        setClustersError(null);
        const initial = list[0]?.id;
        if (initial) {
          setActiveClusterId(initial);
          setClusterStates(
            Object.fromEntries(list.map((c) => [c.id, defaultClusterState()])),
          );
        }
      })
      .catch((err) => setClustersError(String(err)));
  }, []);

  useEffect(() => {
    if (!activeClusterId) return;
    RESOURCE_TYPES.forEach((rt) => fetchResource(rt.key, activeClusterId));
  }, [activeClusterId, fetchResource]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const switchCluster = useCallback((cid) => {
    setActiveClusterId(cid);
    setClusterStates((prev) => ({ ...prev, [cid]: prev[cid] || defaultClusterState() }));
  }, []);

  const openResourceView = useCallback(
    (resType, cid) => {
      const clusterId = cid || activeClusterId;
      if (!clusterId) return;
      fetchResource(resType, clusterId);
      if (clusterId !== activeClusterId) switchCluster(clusterId);
      setClusterStates((prev) => {
        const state = prev[clusterId] || defaultClusterState();
        return {
          ...prev,
          [clusterId]: {
            ...state,
            tabs: detailTabsOnly(state.tabs),
            activeResource: resType,
            activeTab: null,
          },
        };
      });
    },
    [activeClusterId, fetchResource, switchCluster],
  );

  const openDetail = useCallback(
    (resourceType, obj) => {
      const id = `detail·${resourceType}·${obj.name}`;
      const lbl = obj.name.length > 16 ? `${obj.name.slice(0, 14)}…` : obj.name;
      setTabs((prev) => {
        if (prev.find((t) => t.id === id)) return prev;
        return [
          ...prev,
          {
            id,
            type: "detail",
            resourceType,
            obj,
            label: lbl,
            icon: RESOURCE_TYPES.find((r) => r.key === resourceType)?.icon,
          },
        ];
      });
      setActiveTab(id);
    },
    [setTabs, setActiveTab],
  );

  const closeTab = useCallback(
    (id, e) => {
      e.stopPropagation();
      setTabs((prev) => prev.filter((t) => t.id !== id));
      setActiveTab((prev) => (prev === id ? null : prev));
    },
    [setTabs, setActiveTab],
  );

  const goToClusters = useCallback(() => {
    setCS((s) => ({ ...s, activeTab: null, activeResource: null }));
  }, [setCS]);

  const tfKey = (resType) => `${activeClusterId}·${resType}`;
  const getTF = (resType) => tabFilters[tfKey(resType)] || { filter: "", namespace: "All" };
  const setTF = (resType, patch) =>
    setTabFilters((prev) => ({ ...prev, [tfKey(resType)]: { ...getTF(resType), ...patch } }));

  const visibleTabs = detailTabsOnly(cs.tabs);
  const activeDetailTab = cs.tabs.find((t) => t.id === cs.activeTab && t.type === "detail");
  const activeCluster = clusters.find((c) => c.id === activeClusterId);

  const cmdItems = [
    { label: "Go to Clusters overview", fn: () => goToClusters() },
    ...clusters
      .filter((c) => c.id !== activeClusterId)
      .map((c) => ({ label: `Switch to ${c.label}`, fn: () => switchCluster(c.id) })),
    ...RESOURCE_TYPES.map((r) => ({ label: `Open ${r.label}`, fn: () => openResourceView(r.key) })),
    {
      label: "Refresh all",
      fn: () => RESOURCE_TYPES.forEach((rt) => fetchResource(rt.key)),
    },
    {
      label: "Close all tabs",
      fn: () => {
        setTabs(() => []);
        setActiveTab(null);
      },
    },
  ].filter((i) => !cmdQuery || i.label.toLowerCase().includes(cmdQuery.toLowerCase()));

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") {
        setCmdOpen(false);
        return;
      }
      if (e.key === ":" || ((e.metaKey || e.ctrlKey) && e.key === "k")) {
        e.preventDefault();
        setCmdOpen(true);
        return;
      }
      if (document.activeElement === document.body) {
        const rt = RESOURCE_TYPES.find((r) => r.shortcut === e.key.toUpperCase());
        if (rt) openResourceView(rt.key);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [openResourceView]);

  useEffect(() => {
    if (cmdOpen) cmdRef.current?.focus();
  }, [cmdOpen]);

  if (clustersError) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#060a10",
          color: "#ff4d4d",
          ...mono,
          padding: 24,
          textAlign: "center",
        }}
      >
        Failed to load clusters: {clustersError}
      </div>
    );
  }

  if (!activeClusterId || !clusters.length) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#060a10",
          color: "#39ff8a",
          ...mono,
        }}
      >
        Loading clusters…
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#060a10",
        color: "#c8d6e5",
        fontFamily: "'JetBrains Mono', monospace",
        overflow: "hidden",
      }}
    >
      <CommandPalette
        open={cmdOpen}
        query={cmdQuery}
        setQuery={setCmdQuery}
        items={cmdItems}
        inputRef={cmdRef}
        onClose={() => {
          setCmdOpen(false);
          setCmdQuery("");
        }}
      />

      <TopBar
        activeCluster={activeCluster}
        clusterState={{ ...cs, tabs: visibleTabs }}
        onTabClick={setActiveTab}
        onCloseTab={closeTab}
        onOpenPalette={() => setCmdOpen(true)}
        clock={clock}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          clusterState={cs}
          data={data}
          loading={loading}
          onClustersClick={goToClusters}
          onOpenResource={openResourceView}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {activeDetailTab ? (
              <DetailView
                key={`${activeDetailTab.id}-${activeClusterId}`}
                obj={activeDetailTab.obj}
                type={activeDetailTab.resourceType}
                allData={data}
                clusterId={activeClusterId}
                onNavigate={(rt, obj) => openDetail(rt, obj)}
              />
            ) : cs.activeResource ? (
              (() => {
                const rt = cs.activeResource;
                const tf = getTF(rt);
                const ns = ["All", ...new Set((data[rt] || []).map((r) => r.namespace).filter(Boolean))];
                return (
                  <ResourceListTab
                    key={rt}
                    type={rt}
                    data={data[rt] || []}
                    loading={loading[rt]}
                    onSelect={(row) => openDetail(rt, row)}
                    filter={tf.filter}
                    setFilter={(v) => setTF(rt, { filter: v })}
                    namespace={tf.namespace}
                    setNamespace={(v) => setTF(rt, { namespace: v })}
                    namespaces={ns}
                    onRefresh={() => fetchResource(rt)}
                  />
                );
              })()
            ) : (
              <ClustersTab
                clusters={clusters}
                activeClusterId={activeClusterId}
                allClusterData={clusterData}
                onSwitch={switchCluster}
                onOpenResource={openResourceView}
              />
            )}
          </div>
        </div>
      </div>

      <StatusBar activeCluster={activeCluster} connected={!clustersError} version="v0.1.0" />
    </div>
  );
}
