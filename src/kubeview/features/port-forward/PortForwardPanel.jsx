import { useCallback, useEffect, useState } from "react";
import { k8sInvoke } from "../../api";
import { cn } from "../../utils/cn";

export function PortForwardPanel({ clusterId }) {
  const [forwards, setForwards] = useState([]);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const list = await k8sInvoke("list_port_forwards", {}, clusterId);
      setForwards(list);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, [clusterId]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleStop = async (id) => {
    try {
      await k8sInvoke("stop_port_forward", { id }, clusterId);
      refresh();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="border-t border-[#080e18] py-1">
      <div className={cn(
        "px-[10px] py-0.5 text-[#0e1f2e] font-mono text-[0.57rem] uppercase tracking-[0.12em]",
        "flex justify-between items-center"
      )}>
        Port Forwards
        {forwards.length > 0 && (
          <span className="text-[#fb923c] text-[0.62rem] cursor-pointer" onClick={refresh}>
            ↻
          </span>
        )}
      </div>
      {error && (
        <div className={cn("px-[10px] text-[0.62rem] text-[#ff4d4d] font-mono")}>
          {error}
        </div>
      )}
      {forwards.length === 0 ? (
        <div className={cn("px-[10px] text-[0.62rem] text-[#0e1f2e] font-mono")}>
          none
        </div>
      ) : (
        forwards.map((pf) => (
          <div
            key={pf.id}
            className={cn(
              "flex items-center justify-between",
              "px-[9px_10px] py-[3px] font-mono text-[0.62rem]",
              "text-[#39ff8a] border-l-2 border-[#fb923c] my-[2px]"
            )}
          >
            <span className="truncate flex-1">
              {pf.local_port}:{pf.remote_port}
              <span className={cn("text-[#4a7a8a] text-[0.57rem] ml-1")}>
                {pf.pod_name}
              </span>
            </span>
            <button
              type="button"
              onClick={() => handleStop(pf.id)}
              className={cn(
                "bg-none border-none cursor-pointer",
                "text-[#ff4d4d] font-mono text-[0.62rem] px-1 py-[1px]"
              )}
              title={`Stop forward ${pf.local_port}:${pf.remote_port}`}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </div>
  );
}