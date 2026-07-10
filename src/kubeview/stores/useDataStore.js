import { useState, useMemo, useRef, useCallback } from "react";
import { k8sInvoke, discoverResources } from "../api";
import { COMMON_RESOURCES } from "../constants";

export function useDataStore() {
  const [clusterData, setClusterData] = useState({});
  const [clusterLoading, setClusterLoading] = useState({});
  const [tabFilters, setTabFilters] = useState({});
  const [discoveredResources, setDiscoveredResources] = useState([]);
  const discCacheRef = useRef({});

  const resourceLookup = useMemo(() => {
    const map = {};
    for (const r of discoveredResources) map[r.plural] = r;
    return map;
  }, [discoveredResources]);

  const fetchResource = useCallback(async (type, clusterId, resourceLookup) => {
    if (!clusterId) return;
    const common = COMMON_RESOURCES.find((r) => r.key === type);
    const disc = resourceLookup[type];
    if (!common && !disc) return;

    setClusterLoading((prev) => ({
      ...prev,
      [clusterId]: { ...(prev[clusterId] || {}), [type]: true },
    }));
    try {
      let res;
      if (common) {
        res = await k8sInvoke(common.cmd, {}, clusterId);
      } else if (disc) {
        res = await k8sInvoke("list_resource", {
          group: disc.group, version: disc.version,
          kind: disc.kind, plural: disc.plural, namespaced: disc.namespaced,
        }, clusterId);
      }
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
  }, []);

  const getTF = useCallback((cid, activeClusterId) => {
    const key = cid || activeClusterId;
    return tabFilters[key] || { filter: "", namespace: "All" };
  }, [tabFilters]);

  const setTF = useCallback((cid, activeClusterId, patch) => {
    const key = cid || activeClusterId;
    setTabFilters((prev) => {
      const current = prev[key] || { filter: "", namespace: "All" };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  }, []);

  return {
    clusterData, setClusterData,
    clusterLoading, setClusterLoading,
    tabFilters, setTabFilters,
    discoveredResources, setDiscoveredResources,
    discCacheRef, resourceLookup,
    fetchResource, getTF, setTF,
  };
}
