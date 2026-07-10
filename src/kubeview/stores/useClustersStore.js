import { useState, useCallback } from "react";

export function useClustersStore() {
  const [clusters, setClusters] = useState([]);
  const [clustersError, setClustersError] = useState(null);
  const [activeClusterId, setActiveClusterId] = useState(null);
  const [kubeconfigPaths, setKubeconfigPaths] = useState([]);

  const switchCluster = useCallback((cid) => {
    setActiveClusterId(cid);
  }, []);

  return {
    clusters, setClusters,
    clustersError, setClustersError,
    activeClusterId, setActiveClusterId,
    kubeconfigPaths, setKubeconfigPaths,
    switchCluster,
  };
}
