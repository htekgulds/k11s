import { useState, useEffect, useRef } from "react";
import { clusterHealth } from "../api";

export function useClusterHealth(activeClusterId) {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    if (!activeClusterId) return;
    let failureCount = 0;
    let timer = null;

    const scheduleNext = () => {
      const backoff = connected
        ? 10000
        : Math.min(10000 * Math.pow(2, failureCount), 120000);
      timer = setTimeout(check, backoff);
    };

    const check = () => {
      clusterHealth(activeClusterId)
        .then((ok) => {
          setConnected(ok);
          failureCount = ok ? 0 : failureCount + 1;
          scheduleNext();
        })
        .catch(() => {
          setConnected(false);
          failureCount++;
          scheduleNext();
        });
    };

    check();
    return () => clearTimeout(timer);
  }, [activeClusterId]);

  return { connected, setConnected };
}
