import { useCallback, useEffect, useRef, useState } from "react";
import { k8sInvoke } from "../../api";
import { exportContent } from "../../api/export";
import { cn } from "../../utils/cn";
import { Spinner } from "../../components/ui/Spinner";
import { listen } from "@tauri-apps/api/event";

export function LogsTab({ obj, clusterId }) {
  const [logs, setLogs] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [previous, setPrevious] = useState(false);
  const [container, setContainer] = useState(null);
  const [tailing, setTailing] = useState(false);
  const loadedRef = useRef(false);
  const unlistenRef = useRef(null);
  const streamLinesRef = useRef([]);
  const scrollRef = useRef(null);

  const containers = obj?.containers || [];
  const multiContainer = containers.length > 1;

  const stopTail = useCallback(() => {
    k8sInvoke("stop_log_stream", { name: obj.name, namespace: obj.namespace, previous, container }, clusterId).catch(() => {});
    if (unlistenRef.current) {
      unlistenRef.current();
      unlistenRef.current = null;
    }
  }, [obj.name, obj.namespace, clusterId, previous, container]);

  const load = useCallback(
    async (force) => {
      if (!force && loadedRef.current) return;
      loadedRef.current = true;
      setFetching(true);
      try {
        const res = await k8sInvoke(
          "get_pod_logs",
          { name: obj.name, namespace: obj.namespace, previous, container },
          clusterId,
        );
        setLogs(res);
      } catch (err) {
        setLogs({ error: String(err) });
      } finally {
        setFetching(false);
      }
    },
    [obj.name, obj.namespace, clusterId, previous, container],
  );

  const startTail = useCallback(async () => {
    stopTail();
    streamLinesRef.current = [];
    setTailing(true);

    const unlisten = await listen("log-line", (event) => {
      const { name, namespace, line, error } = event.payload;
      if (name !== obj.name || namespace !== obj.namespace) return;
      if (error) {
        streamLinesRef.current = streamLinesRef.current.concat([`[STREAM ERROR] ${error}`]);
      } else {
        streamLinesRef.current = streamLinesRef.current.concat([line]);
      }
      setLogs((prev) => {
        if (!prev || prev.error) return { logs: streamLinesRef.current.join("\n") };
        return { logs: streamLinesRef.current.join("\n") };
      });
    });
    unlistenRef.current = unlisten;

    await k8sInvoke("start_log_stream", { name: obj.name, namespace: obj.namespace, previous, container }, clusterId);

    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 50);
  }, [obj, clusterId, stopTail, previous, container]);

  const toggleTail = useCallback(() => {
    if (tailing) {
      stopTail();
      setTailing(false);
    } else {
      startTail();
    }
  }, [tailing, startTail, stopTail]);

  useEffect(() => {
    return () => { stopTail(); };
  }, [stopTail]);

  useEffect(() => {
    loadedRef.current = false;
    load();
  }, [load]);

  useEffect(() => {
    if (tailing && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, tailing]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className={cn(
        "px-[13px] py-1 border-b border-[#0a1018] flex items-center gap-2",
        "bg-[#050910] flex-shrink-0 flex-wrap"
      )}>
        <span className={cn(
          "text-[0.59rem] uppercase tracking-[0.1em] text-[#1e3a52] font-mono"
        )}>
          stdout · stderr
          {previous && <span className="ml-[6px] text-[#f9a8d4]">· previous</span>}
          {multiContainer && container && <span className="ml-[6px] text-[#39ff8a]">· {container}</span>}
        </span>

        {multiContainer && (
          <select
            value={container || ""}
            onChange={(e) => setContainer(e.target.value || null)}
            className={cn(
              "px-1 py-[2px] rounded text-[0.67rem] font-mono outline-none",
              "bg-[#0a1018] border border-[#0e1f2e] text-[#39ff8a]"
            )}
          >
            <option value="">all containers</option>
            {containers.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => setPrevious((p) => !p)}
          className={cn(
            "px-1.5 py-[2px] rounded text-[0.67rem] font-mono cursor-pointer transition-colors",
            "border",
            previous
              ? "bg-[#f9a8d4]/13 border-[#f9a8d4] text-[#f9a8d4]"
              : "bg-transparent border-[#0e1f2e] text-[#667] hover:bg-[#0a1420] hover:border-[#1a3a4a] hover:text-[#7dd3fc]"
          )}
          title="Show logs from previous container instance (--previous)"
        >
          prev
        </button>
        <button
          type="button"
          onClick={toggleTail}
          className={cn(
            "px-1.5 py-[2px] rounded text-[0.67rem] font-mono cursor-pointer transition-colors",
            "border",
            tailing
              ? "bg-[#39ff8a]/13 border-[#39ff8a] text-[#39ff8a]"
              : "bg-transparent border-[#0e1f2e] text-[#667] hover:bg-[#0a1420] hover:border-[#1a3a4a] hover:text-[#7dd3fc]"
          )}
          title="Stream logs live (tail -f)"
        >
          {tailing ? "● tailing" : "tail"}
        </button>
        <button
          type="button"
          onClick={() => exportContent(
            logs?.logs || "",
            `${obj.name}_logs.txt`,
            [{ name: "Text", extensions: ["txt"] }],
          )}
          className={cn(
            "px-1.5 py-[2px] rounded text-[0.67rem] font-mono cursor-pointer",
            "bg-transparent border border-[#0e1f2e] text-[#4a7a8a]",
            "hover:bg-[#0a1420] hover:border-[#1a3a4a] hover:text-[#7dd3fc]"
          )}
          title="Export to file"
        >
          ⬇ export
        </button>
        <button
          type="button"
          onClick={() => load(true)}
          className={cn(
            "px-1.5 py-[2px] rounded text-[0.67rem] font-mono cursor-pointer",
            "bg-transparent border border-[#0e1f2e] text-[#39ff8a]",
            "hover:bg-[#0a1a0a] hover:border-[#1a3a1a] hover:text-[#5aff9e]"
          )}
        >
          ↻ refresh
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto p-[10px_13px]">
        {fetching ? (
          <div className={cn("flex items-center gap-2", "text-[#39ff8a] font-mono text-[0.72rem]")}>
            <Spinner /> Loading…
          </div>
        ) : (
          <pre className={cn("m-0 font-mono text-[0.71rem] leading-[1.9] whitespace-pre-wrap")}>
            {(logs?.error || logs?.logs || "No logs").split("\n").map((line, i) => {
              const c =
                line.includes("[ERROR]") || line.includes("[FATAL]") || line.includes("Error")
                  ? "text-[#ff6b6b]"
                  : line.includes("[WARN]") || line.includes("Warning")
                  ? "text-[#f5c518]"
                  : "text-[#4a7a8a]";
              const ts = line.match(/^\S+T[\d:.Z]+/)?.[0];
              return (
                <span key={i} className="block">
                  {ts && <span className="text-[#1e3a52]">{ts}</span>}
                  <span className={c}>{ts ? line.slice(ts.length) : line}</span>
                </span>
              );
            })}
          </pre>
        )}
      </div>
    </div>
  );
}