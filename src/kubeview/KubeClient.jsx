import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Plus } from "lucide-react";
import { mono } from "./theme";
import { defaultNavState, COMMON_RESOURCES } from "./constants";
import { assignClusterColors, detailTabId, getClusterColor } from "./utils/clusterColors";
import {
  listClusters, getDefaultContext, getKubeconfigPaths,
  addKubeconfig, addKubeconfigByPath,
  k8sInvoke, listResource, discoverResources,
  startWatchers, stopWatchers, onResourceUpdate,
} from "./api";

import { useClustersStore } from "./stores";
import { useDataStore } from "./stores";
import { useNavigationStore } from "./stores";
import { useClusterHealth, useWatchers, useClock } from "./hooks";
import { useToasts, ToastContainer } from "./components/ui/Toast";

import { CommandPalette } from "./features/command-palette/CommandPalette";
import { ShortcutsModal } from "./features/layout/ShortcutsModal";
import { TopBar } from "./features/layout/TopBar";
import { Sidebar } from "./features/layout/Sidebar";
import { StatusBar } from "./features/layout/StatusBar";
import { DetailView } from "./features/detail-view/DetailView";
import { ResourceListTab } from "./features/resource-list/ResourceListTab";
import { Dashboard } from "./features/dashboard/Dashboard";

// ── Helpers ──────────────────────────────────────────────────────────────

function detailTabsOnly(tabs) {
  return tabs.filter((t) => t.type === "detail");
}

function resolveDetailObject(tab, data) {
  if (!tab || tab.type !== "detail") return null;
  const items = data[tab.resourceType] || [];
  if (tab.resourceType === "nodes")
    return items.find((r) => r.name === tab.name) || null;
  return items.find((r) => r.name === tab.name && r.namespace === tab.namespace) || null;
}

// ── Main component ────────────────────────────────────────────────────────

export default function KubeClient() {
  const {
    clusters, setClusters, clustersError, setClustersError,
    activeClusterId, setActiveClusterId,
    kubeconfigPaths, setKubeconfigPaths,
    switchCluster,
  } = useClustersStore();

  const {
    clusterData, setClusterData, clusterLoading, setClusterLoading,
    discoveredResources, setDiscoveredResources,
    discCacheRef, resourceLookup, fetchResource,
    getTF, setTF,
  } = useDataStore();

  const {
    nav, setNav, setTabs, setActiveTab,
    cmdOpen, setCmdOpen, cmdQuery, setCmdQuery,
    shortcutsOpen, setShortcutsOpen,
  } = useNavigationStore();

  const { connected } = useClusterHealth(activeClusterId);
  const clock = useClock();

  useWatchers({
    activeClusterId, connected,
    setClusterData, setClusterLoading, setDiscoveredResources, discCacheRef,
  });

  const { toasts, addToast, removeToast } = useToasts();

  const cmdRef = useRef(null);
  const activeIdRef = useRef(activeClusterId);
  activeIdRef.current = activeClusterId;

  // ── Derived data ─────────────────────────────────────────────────────────

  const data = clusterData[activeClusterId] || {};
  const loading = clusterLoading[activeClusterId] || {};

  const visibleTabs = useMemo(
    () => detailTabsOnly(nav.tabs).map((tab) => {
      const tabData = clusterData[tab.clusterId] || {};
      const obj = resolveDetailObject(tab, tabData);
      return { ...tab, tabErr: obj && ["CrashLoopBackOff", "Error", "NotReady"].includes(obj.status) };
    }),
    [nav.tabs, clusterData],
  );

  const activeDetailTab = nav.tabs.find((t) => t.id === nav.activeTab && t.type === "detail");
  const tabClusterId = activeDetailTab?.clusterId || activeClusterId;
  const tabData = clusterData[tabClusterId] || {};
  const detailObj = resolveDetailObject(activeDetailTab, tabData);
  const activeCluster = clusters.find((c) => c.id === activeClusterId);

  const inDetailView = !!(activeDetailTab && detailObj);
  const showFilter = !inDetailView && nav.activeResource && nav.activeResource !== "dashboard";
  const tf = getTF(activeClusterId);
  const handleFilterChange = useCallback(
    (v) => setTF(activeClusterId, { filter: v }),
    [activeClusterId, setTF],
  );

  // ── Navigation callbacks ─────────────────────────────────────────────────

  const openResourceView = useCallback(
    (resType, cid) => {
      const clusterId = cid || activeClusterId;
      if (!clusterId) return;
      if (clusterId !== activeClusterId) setActiveClusterId(clusterId);
      fetchResource(resType, clusterId, resourceLookup);
      setNav((n) => ({ ...n, activeResource: resType, activeTab: null }));
    },
    [activeClusterId, fetchResource, resourceLookup, setNav, setActiveClusterId],
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
        return [...prev, {
          id, type: "detail", clusterId: cid, color,
          resourceType, name: obj.name, namespace: ns, label: lbl,
        }];
      });
      return id;
    },
    [activeClusterId, clusters, setTabs],
  );

  const openDetail = useCallback(
    (resType, obj, clusterId) => {
      const id = addTab(resType, obj, clusterId);
      if (id) setActiveTab(id);
    },
    [addTab, setActiveTab],
  );

  const openDetailBackground = useCallback(
    (resType, obj, clusterId) => { addTab(resType, obj, clusterId); },
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
    [nav.tabs, activeClusterId, setActiveTab, setActiveClusterId],
  );

  const closeTab = useCallback(
    (id, e) => {
      if (e) e.stopPropagation();
      setTabs((prev) => prev.filter((t) => t.id !== id));
      setActiveTab((prev) => (prev === id ? null : prev));
    },
    [setTabs, setActiveTab],
  );

  // ── Initial load ─────────────────────────────────────────────────────────

  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    listClusters()
      .then((list) => {
        const colored = assignClusterColors(list);
        setClusters(colored);
        setClustersError(null);
        getDefaultContext()
          .then((ctx) => {
            if (ctx && colored.find((c) => c.id === ctx)) setActiveClusterId(ctx);
            else if (colored[0]?.id) setActiveClusterId(colored[0].id);
          })
          .catch(() => { if (colored[0]?.id) setActiveClusterId(colored[0].id); });
      })
      .catch((err) => setClustersError(String(err)));
    getKubeconfigPaths().then(setKubeconfigPaths).catch(() => {});
  }, []);

  // ── Stale tab cleanup ───────────────────────────────────────────────────

  useEffect(() => {
    const staleTab = nav.tabs.find((t) => {
      if (t.type !== "detail") return false;
      const td = clusterData[t.clusterId] || {};
      return !resolveDetailObject(t, td);
    });
    if (staleTab) closeTab(staleTab.id, null);
  }, [clusterData, nav.tabs, closeTab]);

  // ── Cluster mutation callbacks ──────────────────────────────────────────

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
      if (!updated) { addToast("No changes: path is already configured", "warning"); return; }
      const colored = assignClusterColors(updated);
      setClusters(colored);
      setClustersError(null);
      setActiveClusterId((prev) => prev || colored[0]?.id || null);
      getKubeconfigPaths().then((paths) => {
        setKubeconfigPaths(paths);
        addToast(`Kubeconfig added: ${path}`, "success");
      }).catch(() => {});
    } catch (e) {
      console.error("Failed to add kubeconfig by path:", e);
      addToast(`Failed to add kubeconfig: ${e}`, "error");
    }
  }, [addToast]);

  // ── Command palette items ───────────────────────────────────────────────

  const cmdItems = useMemo(() => [
    ...clusters
      .filter((c) => c.id !== activeClusterId)
      .map((c) => ({ label: `Switch to ${c.label}`, fn: () => switchCluster(c.id) })),
    ...COMMON_RESOURCES.map((r) => ({ label: `Open ${r.label}`, fn: () => openResourceView(r.key) })),
    { label: "Refresh all", fn: () => COMMON_RESOURCES.forEach((rt) => fetchResource(rt.key)) },
    { label: "Close all tabs", fn: () => { setTabs(() => []); setActiveTab(null); } },
  ], [clusters, activeClusterId, switchCluster, openResourceView, fetchResource, setTabs, setActiveTab]);

  const resourceItems = useMemo(
    () => (cmdOpen && cmdQuery
      ? (() => {
          const q = cmdQuery.toLowerCase();
          const results = [];
          for (const [cid, cdata] of Object.entries(clusterData)) {
            const cl = clusters.find((c) => c.id === cid)?.label || cid;
            for (const [rtKey, items] of Object.entries(cdata)) {
              if (!Array.isArray(items)) continue;
              const rt = COMMON_RESOURCES.find((r) => r.key === rtKey);
              const rtLabel = rt?.label || rtKey;
              for (const obj of items) {
                const ss = `${obj.name} ${obj.namespace || ""} ${rtLabel}`.toLowerCase();
                if (ss.includes(q)) {
                  results.push({
                    label: `${rtLabel.slice(0, 4)} ${obj.name} ${obj.namespace ? `(${obj.namespace})` : ""}`,
                    clusterId: cid, rt: rtKey, obj,
                  });
                }
              }
            }
          }
          results.sort((a, b) => {
            const aExact = a.obj.name.toLowerCase() === q ? 0 : 1;
            const bExact = b.obj.name.toLowerCase() === q ? 0 : 1;
            return aExact - bExact || a.obj.name.localeCompare(b.obj.name);
          });
          return results.slice(0, 20);
        })()
      : []),
    [cmdOpen, cmdQuery, clusterData, clusters],
  );

  const paletteItems = useMemo(
    () => resourceItems.length > 0
      ? [
          ...resourceItems.map((r) => ({
            label: `📎 ${r.label}`,
            fn: () => openDetail(r.rt, r.obj, r.clusterId),
          })),
          ...(cmdItems.some((i) => !cmdQuery || i.label.toLowerCase().includes(cmdQuery.toLowerCase()))
            ? [{ separator: true }] : []),
          ...cmdItems.filter((i) => !cmdQuery || i.label.toLowerCase().includes(cmdQuery.toLowerCase())),
        ]
      : cmdItems.filter((i) => !cmdQuery || i.label.toLowerCase().includes(cmdQuery.toLowerCase())),
    [resourceItems, cmdItems, cmdQuery, openDetail],
  );

  // ── Hotkeys ──────────────────────────────────────────────────────────────

  useHotkeys("escape", () => setCmdOpen(false), { enableOnFormTags: true });
  useHotkeys("mod+k, :", () => setCmdOpen(true), { preventDefault: true, enableOnFormTags: true });
  useHotkeys(
    COMMON_RESOURCES.map((r) => r.shortcut.toLowerCase()).join(", "),
    (e) => {
      const rt = COMMON_RESOURCES.find((r) => r.shortcut === e.key.toUpperCase());
      if (rt) openResourceView(rt.key);
    },
    { preventDefault: true },
    [openResourceView],
  );
  useHotkeys("?, mod+/", () => setShortcutsOpen((v) => !v), { preventDefault: true, enableOnFormTags: true });
  useHotkeys("mod+w", (e) => { if (nav.activeTab) closeTab(nav.activeTab, e); },
    { preventDefault: true }, [nav.activeTab, closeTab]);

  useEffect(() => { if (cmdOpen) cmdRef.current?.focus(); }, [cmdOpen]);

  // ── Empty state ─────────────────────────────────────────────────────────

  if (!activeClusterId || !clusters.length) {
    const msg = clustersError || "No kubeconfig contexts found. Add a kubeconfig file or folder to get started.";
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100vh", background: "#060a10",
        color: "#4a7a8a", ...mono, gap: 16,
      }}>
        <div style={{ fontSize: "0.85rem", textAlign: "center", maxWidth: 360, lineHeight: "1.5" }}>{msg}</div>
        <button type="button" onClick={handleAddCluster}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#0e1f2e", border: "1px solid #1a3a4a", color: "#bdd",
            padding: "10px 20px", borderRadius: 6, cursor: "pointer",
            ...mono, fontSize: "0.85rem",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#1a3a4a"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#0e1f2e"; }}>
          <Plus size={18} /> Add Cluster
        </button>
      </div>
    );
  }

  // ── Main content area ────────────────────────────────────────────────────

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
      const tf = getTF(cid);
      return (
        <ResourceListTab
          key={`${activeDetailTab.id}-missing`}
          type={rt}
          data={missingData[rt] || []}
          loading={missingLoading[rt]}
          onSelect={(row) => openDetail(rt, row, cid)}
          onMiddleClick={(row) => openDetailBackground(rt, row, cid)}
          filter={tf.filter}
          setFilter={(v) => setTF(cid, { filter: v })}
          namespace={tf.namespace}
          onRefresh={() => fetchResource(rt, cid, resourceLookup)}
          clusterId={cid}
        />
      );
    }

    if (nav.activeResource === "dashboard") {
      return (
        <Dashboard
          clusterId={activeClusterId}
          onRefreshResource={(rt) => fetchResource(rt, activeClusterId, resourceLookup)}
        />
      );
    }

    if (nav.activeResource) {
      const rt = nav.activeResource;
      const tf = getTF(activeClusterId);
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
          onRefresh={() => fetchResource(rt, activeClusterId, resourceLookup)}
          clusterId={activeClusterId}
        />
      );
    }

    return null;
  };

  // ── Layout ───────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#060a10", color: "#c8d6e5",
      fontFamily: "'JetBrains Mono', monospace", overflow: "hidden",
    }}>
      <CommandPalette
        open={cmdOpen}
        query={cmdQuery}
        setQuery={setCmdQuery}
        items={paletteItems}
        inputRef={cmdRef}
        onClose={() => { setCmdOpen(false); setCmdQuery(""); }}
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
        activeNamespace={getTF(activeClusterId).namespace || "All"}
        onNamespaceChange={(ns) => setTF(activeClusterId, { namespace: ns })}
        data={data}
        showFilter={showFilter}
        filterValue={tf.filter || ""}
        onFilterChange={handleFilterChange}
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
          discoveredResources={discoveredResources}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, overflow: "hidden" }}>{renderMain()}</div>
        </div>
      </div>

      <StatusBar
        activeCluster={activeCluster}
        connected={connected}
        version="v0.1.0"
        kubeconfigPaths={kubeconfigPaths}
        onAddCluster={handleAddCluster}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
