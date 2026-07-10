import { useEffect, useRef } from "react";
import { onResourceUpdate, startWatchers, stopWatchers, discoverResources } from "../api";
import { COMMON_RESOURCES } from "../constants";

export function useWatchers({
  activeClusterId, connected,
  setClusterData, setClusterLoading, setDiscoveredResources, discCacheRef,
}) {
  const unlistenRef = useRef(null);
  const activeIdRef = useRef(activeClusterId);

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
      if (unlisten) { unlisten(); unlistenRef.current = null; }
      else { const fn = unlistenRef.current; if (fn) { fn(); unlistenRef.current = null; } }
    };
  }, []);

  // Start/stop watchers when active cluster or connection changes
  useEffect(() => {
    if (!activeClusterId) return;

    const prevId = activeIdRef.current;
    if (prevId && prevId !== activeClusterId) {
      stopWatchers(prevId).catch(() => {});
    }
    activeIdRef.current = activeClusterId;

    const loadingState = {};
    COMMON_RESOURCES.forEach((rt) => { loadingState[rt.key] = true; });
    setClusterLoading((prev) => ({ ...prev, [activeClusterId]: loadingState }));
    setClusterData((prev) => {
      if (prev[activeClusterId]) return prev;
      return { ...prev, [activeClusterId]: {} };
    });

    if (connected) {
      if (!discCacheRef.current[activeClusterId]) {
        discoverResources(activeClusterId)
          .then((list) => {
            setDiscoveredResources(list);
            discCacheRef.current[activeClusterId] = list;
          })
          .catch((err) => {
            console.error("Resource discovery failed:", err);
            setDiscoveredResources([]);
          });
      } else {
        setDiscoveredResources(discCacheRef.current[activeClusterId]);
      }

      startWatchers(activeClusterId).catch((err) => {
        console.error("Failed to start watchers:", err);
        setClusterLoading((prev) => ({
          ...prev,
          [activeClusterId]: Object.fromEntries(COMMON_RESOURCES.map((rt) => [rt.key, false])),
        }));
      });
    } else {
      setClusterLoading((prev) => ({
        ...prev,
        [activeClusterId]: Object.fromEntries(COMMON_RESOURCES.map((rt) => [rt.key, false])),
      }));
    }

    return () => {
      stopWatchers(activeClusterId).catch(() => {});
    };
  }, [activeClusterId, connected]);
}

function applyUpdate(prev, context, resourceType, name, namespace, object) {
  const cluster = { ...(prev[context] || {}) };
  const items = [...(cluster[resourceType] || [])];
  const idx = resourceType === "nodes"
    ? items.findIndex((r) => r.name === name)
    : items.findIndex((r) => r.name === name && r.namespace === namespace);
  if (idx >= 0) items[idx] = object;
  else items.push(object);
  cluster[resourceType] = items;
  return { ...prev, [context]: cluster };
}

function removeUpdate(prev, context, resourceType, name, namespace) {
  const cluster = { ...(prev[context] || {}) };
  cluster[resourceType] = (cluster[resourceType] || []).filter((r) =>
    resourceType === "nodes"
      ? r.name !== name
      : !(r.name === name && r.namespace === namespace)
  );
  return { ...prev, [context]: cluster };
}
