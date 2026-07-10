import { useState, useCallback } from "react";
import { defaultNavState, COMMON_RESOURCES } from "../constants";
import { detailTabId, getClusterColor } from "../utils/clusterColors";

export function useNavigationStore() {
  const [nav, setNav] = useState(defaultNavState);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const setTabs = useCallback((u) => {
    setNav((n) => ({ ...n, tabs: typeof u === "function" ? u(n.tabs) : u }));
  }, []);

  const setActiveTab = useCallback((u) => {
    setNav((n) => ({
      ...n,
      activeTab: typeof u === "function" ? u(n.activeTab) : u,
    }));
  }, []);

  const openResourceView = useCallback((resType, clusterId, activeClusterId, fetchResource) => {
    const cid = clusterId || activeClusterId;
    if (!cid) return;
    if (cid !== activeClusterId) {
      // caller must handle switchCluster if needed
    }
    fetchResource(resType, cid, null);
    setNav((n) => ({ ...n, activeResource: resType, activeTab: null }));
  }, []);

  const addTab = useCallback((resourceType, obj, clusterId, activeClusterId, clusters, setTabsFn) => {
    const cid = clusterId || activeClusterId;
    if (!cid) return null;
    const ns = obj.namespace || "";
    const id = detailTabId(cid, resourceType, ns, obj.name);
    const lbl = obj.name.length > 16 ? `${obj.name.slice(0, 14)}…` : obj.name;
    const color = getClusterColor(clusters, cid);

    setTabsFn((prev) => {
      if (prev.find((t) => t.id === id)) return prev;
      return [...prev, {
        id, type: "detail", clusterId: cid, color,
        resourceType, name: obj.name, namespace: ns, label: lbl,
      }];
    });
    return id;
  }, []);

  const openDetail = useCallback((resourceType, obj, clusterId, activeClusterId, clusters, setTabsFn, setActiveTabFn) => {
    const id = addTab(resourceType, obj, clusterId, activeClusterId, clusters, setTabsFn);
    if (id) setActiveTabFn(id);
  }, [addTab]);

  const openDetailBackground = useCallback((resourceType, obj, clusterId, activeClusterId, clusters, setTabsFn) => {
    addTab(resourceType, obj, clusterId, activeClusterId, clusters, setTabsFn);
  }, [addTab]);

  const handleTabClick = useCallback((id, clusters, activeClusterId, setActiveClusterId, setTabsFn, setActiveTabFn) => {
    const tab = nav.tabs.find((t) => t.id === id);
    setActiveTabFn(id);
    if (tab?.clusterId && tab.clusterId !== activeClusterId) {
      setActiveClusterId(tab.clusterId);
    }
  }, [nav.tabs]);

  const closeTab = useCallback((id, e, setTabsFn, setActiveTabFn) => {
    if (e) e.stopPropagation();
    setTabsFn((prev) => prev.filter((t) => t.id !== id));
    setActiveTabFn((prev) => (prev === id ? null : prev));
  }, []);

  return {
    nav, setNav, setTabs, setActiveTab,
    cmdOpen, setCmdOpen,
    cmdQuery, setCmdQuery,
    shortcutsOpen, setShortcutsOpen,
    openResourceView, addTab, openDetail,
    openDetailBackground, handleTabClick, closeTab,
  };
}
