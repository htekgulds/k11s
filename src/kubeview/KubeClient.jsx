import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Plus } from "lucide-react";
import { addKubeconfig, addKubeconfigByPath, clusterHealth, getDefaultContext, getKubeconfigPaths, k8sInvoke, listClusters, onResourceUpdate, removeKubeconfigPath, startWatchers, stopWatchers } from "./api";
import { defaultNavState, RESOURCE_TYPES } from "./constants";

import { CommandPalette } from "./components/CommandPalette";
import { DetailView } from "./components/DetailView";
import { ResourceListTab } from "./components/ResourceListTab";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TopBar } from "./components/TopBar";
import { mono } from "./theme";
import { assignClusterColors, detailTabId, getClusterColor } from "./utils/clusterColors";

function detailTabsOnly(tabs) {
  return tabs.filter((t) => t.type === "detail");
}

function resolveDetailObject(tab, data) {
  if (!tab || tab.type !== "detail") return null;
  const items = data[tab.resourceType] || [];
  if (tab.resourceType === "nodes") {
    return items.find((r) => r.name === tab.name) || null;
  }
  return items.find((r) => r.name === tab.name && r.namespace === tab.namespace) || null;
}

function applyUpdate(prev, context, resourceType, name, namespace, object) {
  const cluster = { ...(prev[context] || {}) };
  const items = [...(cluster[resourceType] || [])];
  const idx = resourceType === "nodes"
    ? items.findIndex((r) => r.name === name)
    : items.findIndex((r) => r.name === name && r.namespace === namespace);
  if (idx >= 0) {
    items[idx] = object;
  } else {
    items.push(object);
  }
  cluster[resourceType] = items;
  return { ...prev, [context]: cluster };
}

function removeUpdate(prev, context, resourceType, name, namespace) {
  const cluster = { ...(prev[context] || {}) };
  const items = (cluster[resourceType] || []).filter((r) =>
    resourceType === "nodes"
      ? r.name !== name
      : !(r.name === name && r.namespace === namespace)
  );
  cluster[resourceType] = items;
  return { ...prev, [context]: cluster };
}

export default function KubeClient() {
  const [clusters, setClusters] = useState([]);
  const [clustersError, setClustersError] = useState(null);
  const [activeClusterId, setActiveClusterId] = useState(null);
  const [nav, setNav] = useState(defaultNavState);
  const [clusterData, setClusterData] = useState({});
  const [clusterLoading, setClusterLoading] = useState({});
  const [tabFilters, setTabFilters] = useState({});
  const [connected, setConnected] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [kubeconfigPaths, setKubeconfigPaths] = useState([]);
  const cmdRef = useRef(null);
  const unlistenRef = useRef(null);
  const activeIdRef = useRef(activeClusterId);

  activeIdRef.current = activeClusterId;

  const data = clusterData[activeClusterId] || {};
  const loading = clusterLoading[activeClusterId] || {};

  const setTabs = useCallback((u) => {
    setNav((n) => ({ ...n, tabs: typeof u === "function" ? u(n.tabs) : u }));
  }, []);

  const setActiveTab = useCallback((u) => {
    setNav((n) => ({
      ...n,
      activeTab: typeof u === "function" ? u(n.activeTab) : u,
    }));
  }, []);

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

  // Event listener for real-time resource updates
  useEffect(() => {
    let unlisten = null;
    onResourceUpdate((payload) => {
      const { context, resource_type: resourceType, action, name, namespace, object } = payload;

      if (action === "apply" && object) {
        setClusterData((prev) => applyUpdate(prev, context, resourceType, name, namespace, object));
      } else if (action === "delete") {
        setClusterData((prev) => removeUpdate(prev, context, resourceType, name, namespace));
      } else if (action === "init_done") {
        setClusterLoading((prev) => ({
          ...prev,
          [context]: { ...(prev[context] || {}), [resourceType]: false },
        }));
      } else if (action === "error") {
        console.error(`watcher error for ${context}/${resourceType}:`, object?.error);
        setClusterLoading((prev) => ({
          ...prev,
          [context]: { ...(prev[context] || {}), [resourceType]: false },
        }));
      }
    }).then((fn) => {
      unlisten = fn;
      unlistenRef.current = fn;
    });

    return () => {
      if (unlisten) {
        unlisten();
        unlistenRef.current = null;
      } else {
        // If listen() hasn't resolved yet, clean up via ref
        const fn = unlistenRef.current;
        if (fn) { fn(); unlistenRef.current = null; }
      }
    };
  }, []);

  // Start/stop watchers when active cluster or connection status changes
  useEffect(() => {
    if (!activeClusterId) return;

    const prevId = activeIdRef.current;
    if (prevId && prevId !== activeClusterId) {
      stopWatchers(prevId).catch(() => {});
    }

    const loadingState = {};
    RESOURCE_TYPES.forEach((rt) => { loadingState[rt.key] = true; });
    setClusterLoading((prev) => ({ ...prev, [activeClusterId]: loadingState }));
    setClusterData((prev) => {
      if (prev[activeClusterId]) return prev;
      return { ...prev, [activeClusterId]: {} };
    });

    if (connected) {
      startWatchers(activeClusterId).catch((err) => {
        console.error("Failed to start watchers:", err);
        setClusterLoading((prev) => ({
          ...prev,
          [activeClusterId]: Object.fromEntries(RESOURCE_TYPES.map((rt) => [rt.key, false])),
        }));
      });
    } else {
      setClusterLoading((prev) => ({
        ...prev,
        [activeClusterId]: Object.fromEntries(RESOURCE_TYPES.map((rt) => [rt.key, false])),
      }));
    }

    return () => {
      stopWatchers(activeClusterId).catch(() => {});
    };
  }, [activeClusterId, connected]);

  useEffect(() => {
    listClusters()
      .then((list) => {
        const colored = assignClusterColors(list);
        setClusters(colored);
        setClustersError(null);
        // Auto-select default context if set via --context CLI flag
        getDefaultContext().then((ctx) => {
          if (ctx && colored.find((c) => c.id === ctx)) {
            setActiveClusterId(ctx);
          } else {
            const initial = colored[0]?.id;
            if (initial) setActiveClusterId(initial);
          }
        }).catch(() => {
          const initial = colored[0]?.id;
          if (initial) setActiveClusterId(initial);
        });
      })
      .catch((err) => setClustersError(String(err)));
    getKubeconfigPaths().then(setKubeconfigPaths).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!activeClusterId) return;
    const check = () => {
      clusterHealth(activeClusterId).then(setConnected).catch(() => setConnected(false));
    };
    check();
    const t = setInterval(check, 10000);
    return () => clearInterval(t);
  }, [activeClusterId]);

  const handleAddCluster = useCallback(async () => {
    const updated = await addKubeconfig();
    if (!updated) return;
    const colored = assignClusterColors(updated);
    setClusters(colored);
    setClustersError(null);
    setActiveClusterId((prev) => prev || colored[0]?.id || null);
    getKubeconfigPaths().then(setKubeconfigPaths).catch(() => {});
  }, []);

  const handleAddKubeconfigByPath = useCallback(async (path) => {
    try {
      const updated = await addKubeconfigByPath(path);
      if (!updated) return;
      const colored = assignClusterColors(updated);
      setClusters(colored);
      setClustersError(null);
      setActiveClusterId((prev) => prev || colored[0]?.id || null);
      getKubeconfigPaths().then(setKubeconfigPaths).catch(() => {});
    } catch (e) {
      console.error("Failed to add kubeconfig by path:", e);
    }
  }, []);

  const switchCluster = useCallback((cid) => {
    setActiveClusterId(cid);
  }, []);

  const openResourceView = useCallback(
    (resType, cid) => {
      const clusterId = cid || activeClusterId;
      if (!clusterId) return;
      if (clusterId !== activeClusterId) setActiveClusterId(clusterId);
      fetchResource(resType, clusterId);
      setNav((n) => ({ ...n, activeResource: resType, activeTab: null }));
    },
    [activeClusterId, fetchResource],
  );

  const addTab = useCallback(
    (resourceType, obj, clusterId) => {
      const cid = clusterId || activeClusterId;
      if (!cid) return null;
      const ns = obj.namespace || "";
      const id = detailTabId(cid, resourceType, ns, obj.name);
      const lbl = obj.name.length > 16 ? `${obj.name.slice(0, 14)}…` : obj.name;
      const color = getClusterColor(clusters, cid);

      setTabs((prev) => {
        if (prev.find((t) => t.id === id)) return prev;
        return [
          ...prev,
          { id, type: "detail", clusterId: cid, color, resourceType, name: obj.name, namespace: ns, label: lbl },
        ];
      });
      return id;
    },
    [activeClusterId, clusters, setTabs],
  );

  const openDetail = useCallback(
    (resourceType, obj, clusterId) => {
      const id = addTab(resourceType, obj, clusterId);
      if (id) setActiveTab(id);
    },
    [addTab, setActiveTab],
  );

  const openDetailBackground = useCallback(
    (resourceType, obj, clusterId) => {
      addTab(resourceType, obj, clusterId);
    },
    [addTab],
  );

  const handleTabClick = useCallback(
    (id) => {
      const tab = nav.tabs.find((t) => t.id === id);
      setActiveTab(id);
      if (tab?.clusterId && tab.clusterId !== activeClusterId) {
        setActiveClusterId(tab.clusterId);
      }
    },
    [nav.tabs, activeClusterId, setActiveTab],
  );

  const closeTab = useCallback(
    (id, e) => {
      e.stopPropagation();
      setTabs((prev) => prev.filter((t) => t.id !== id));
      setActiveTab((prev) => (prev === id ? null : prev));
    },
    [setTabs, setActiveTab],
  );

  const clusterKey = (cid) => cid || activeClusterId;
  const getTF = (cid) => tabFilters[clusterKey(cid)] || { filter: "", namespace: "All" };
  const setTF = (cid, patch) =>
    setTabFilters((prev) => ({ ...prev, [clusterKey(cid)]: { ...getTF(cid), ...patch } }));

  const visibleTabs = detailTabsOnly(nav.tabs).map((tab) => {
    const tabData = clusterData[tab.clusterId] || {};
    const obj = resolveDetailObject(tab, tabData);
    return {
      ...tab,
      tabErr: obj && ["CrashLoopBackOff", "Error", "NotReady"].includes(obj.status),
    };
  });
  const activeDetailTab = nav.tabs.find((t) => t.id === nav.activeTab && t.type === "detail");
  const tabClusterId = activeDetailTab?.clusterId || activeClusterId;
  const tabData = clusterData[tabClusterId] || {};
  const detailObj = resolveDetailObject(activeDetailTab, tabData);
  const activeCluster = clusters.find((c) => c.id === activeClusterId);

  const cmdItems = [
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

  useHotkeys("escape", () => setCmdOpen(false), { enableOnFormTags: true });
  useHotkeys("mod+k, :", () => setCmdOpen(true), { preventDefault: true, useKey: true });
  useHotkeys(
    RESOURCE_TYPES.map((r) => r.shortcut.toLowerCase()).join(", "),
    (e) => {
      const rt = RESOURCE_TYPES.find((r) => r.shortcut === e.key.toUpperCase());
      if (rt) openResourceView(rt.key);
    },
    { preventDefault: true },
    [openResourceView],
  );

  useHotkeys("?, mod+/", () => setShortcutsOpen((v) => !v), { preventDefault: true, enableOnFormTags: true });
  useHotkeys("mod+w", (e) => {
    if (nav.activeTab) {
      closeTab(nav.activeTab, e);
    }
  }, { preventDefault: true }, [nav.activeTab, closeTab]);

  useEffect(() => {
    if (cmdOpen) cmdRef.current?.focus();
  }, [cmdOpen]);

  if (!activeClusterId || !clusters.length) {
    const msg = clustersError || "No kubeconfig contexts found. Add a kubeconfig file or folder to get started.";
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#060a10",
          color: "#4a7a8a",
          ...mono,
          gap: 16,
        }}
      >
        <div style={{ fontSize: "0.85rem", textAlign: "center", maxWidth: 360, lineHeight: "1.5" }}>
          {msg}
        </div>
        <button
          type="button"
          onClick={handleAddCluster}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#0e1f2e",
            border: "1px solid #1a3a4a",
            color: "#bdd",
            padding: "10px 20px",
            borderRadius: 6,
            cursor: "pointer",
            ...mono,
            fontSize: "0.85rem",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#1a3a4a"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#0e1f2e"; }}
        >
          <Plus size={18} />
          Add Cluster
        </button>
      </div>
    );
  }

  const renderMain = () => {
    if (activeDetailTab && detailObj) {
      return (
        <DetailView
          key={`${activeDetailTab.id}-${tabClusterId}`}
          obj={detailObj}
          type={activeDetailTab.resourceType}
          allData={tabData}
          clusterId={tabClusterId}
          onNavigate={(rt, obj) => openDetail(rt, obj, tabClusterId)}
        />
      );
    }

    if (activeDetailTab && !detailObj) {
      const rt = activeDetailTab.resourceType;
      const cid = activeDetailTab.clusterId;
      const missingData = clusterData[cid] || {};
      const missingLoading = clusterLoading[cid] || {};
      const tf = tabFilters[cid] || { filter: "", namespace: "All" };
      const ns = ["All", ...new Set((missingData[rt] || []).map((r) => r.namespace).filter(Boolean))];
      return (
        <ResourceListTab
          key={`${activeDetailTab.id}-missing`}
          type={rt}
          data={missingData[rt] || []}
          loading={missingLoading[rt]}
          onSelect={(row) => openDetail(rt, row, cid)}
          onMiddleClick={(row) => openDetailBackground(rt, row, cid)}
          filter={tf.filter}
          setFilter={(v) =>
            setTabFilters((prev) => ({
              ...prev,
              [cid]: { ...tf, filter: v },
            }))
          }
          namespace={tf.namespace}
          setNamespace={(v) =>
            setTabFilters((prev) => ({
              ...prev,
              [cid]: { ...tf, namespace: v },
            }))
          }
          namespaces={ns}
          onRefresh={() => fetchResource(rt, cid)}
          clusterId={cid}
        />
      );
    }

    if (nav.activeResource) {
      const rt = nav.activeResource;
      const tf = getTF(activeClusterId);
      const ns = ["All", ...new Set((data[rt] || []).map((r) => r.namespace).filter(Boolean))];
      return (
        <ResourceListTab
          key={rt}
          type={rt}
          data={data[rt] || []}
          loading={loading[rt]}
          onSelect={(row) => openDetail(rt, row, activeClusterId)}
          onMiddleClick={(row) => openDetailBackground(rt, row, activeClusterId)}
          filter={tf.filter}
          setFilter={(v) => setTF(activeClusterId, { filter: v })}
          namespace={tf.namespace}
          setNamespace={(v) => setTF(activeClusterId, { namespace: v })}
          namespaces={ns}
          onRefresh={() => fetchResource(rt)}
          clusterId={activeClusterId}
        />
      );
    }

    return null;
  };

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
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <TopBar
        clusters={clusters}
        activeCluster={activeCluster}
        onSwitchCluster={switchCluster}
        clusterState={{ ...nav, tabs: visibleTabs }}
        onTabClick={handleTabClick}
        onCloseTab={closeTab}
        onOpenPalette={() => setCmdOpen(true)}
        clock={clock}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar
          clusterState={nav}
          activeCluster={activeCluster}
          data={data}
          loading={loading}
          onOpenResource={openResourceView}
          onAddCluster={handleAddCluster}
          onAddKubeconfigByPath={handleAddKubeconfigByPath}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflow: "hidden" }}>{renderMain()}</div>
        </div>
      </div>

      <StatusBar activeCluster={activeCluster} connected={connected} version="v0.1.0" kubeconfigPaths={kubeconfigPaths} onAddCluster={handleAddCluster} />
    </div>
  );
}
