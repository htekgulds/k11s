import { useCallback, useEffect, useRef, useState } from "react";
import {
  execPodShell,
  execPodStdin,
  execPodStop,
  onShellOutput,
} from "../../api";
import { cn } from "../../utils/cn";

export function ShellTab({ obj, clusterId }) {
  const [sessionId, setSessionId] = useState(null);
  const [lines, setLines] = useState([]);
  const [running, setRunning] = useState(false);
  const [cmd, setCmd] = useState("");
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  const startShell = useCallback(async () => {
    setRunning(true);
    setError(null);
    setLines([{ type: "info", data: "Connecting…" }]);
    try {
      const sid = await execPodShell(clusterId, obj.namespace, obj.name, null);
      setSessionId(sid);
      setLines([
        {
          type: "info",
          data: `Session ${sid.slice(0, 12)}… started. Type commands below.`,
        },
      ]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      setError(String(err));
      setLines([{ type: "error", data: `Failed: ${err}` }]);
      setRunning(false);
    }
  }, [clusterId, obj.name, obj.namespace]);

  // Listen for shell-output events
  useEffect(() => {
    let unlisten = null;
    onShellOutput((payload) => {
      if (payload.session_id !== sessionId) return;
      if (payload.type === "stdout" || payload.type === "stderr") {
        setLines((prev) => [...prev, { type: payload.type, data: payload.data }]);
      } else if (payload.type === "exit") {
        setLines((prev) => [
          ...prev,
          { type: "info", data: "--- session ended ---" },
        ]);
        setRunning(false);
        setSessionId(null);
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        execPodStop(sessionId).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sessionId || !cmd.trim()) return;
    const text = cmd + "\n";
    setCmd("");
    try {
      await execPodStdin(sessionId, text);
    } catch (err) {
      setLines((prev) => [...prev, { type: "error", data: `Stdin error: ${err}` }]);
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl+C -> send interrupt signal
    if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
      e.preventDefault();
      if (sessionId) {
        execPodStdin(sessionId, "\x03").catch(() => {});
      }
    }
    // Ctrl+D -> close session
    if (e.ctrlKey && (e.key === "d" || e.key === "D")) {
      e.preventDefault();
      if (sessionId) {
        execPodStdin(sessionId, "\x04").catch(() => {});
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className={cn(
        "px-3.5 py-[5px] border-b border-[#0a1018] flex items-center gap-2",
        "bg-[#050910] flex-shrink-0"
      )}>
        <span className={cn(
          "text-[0.59rem] uppercase tracking-[0.1em] font-mono",
          running ? "text-[#39ff8a]" : "text-[#556]"
        )}>
          {running ? "🟢 shell" : "⏹ shell"}
        </span>
        {!running && !error && (
          <button
            type="button"
            onClick={startShell}
            className={cn(
              "ml-auto px-2 py-[2px] rounded text-[0.67rem] font-mono cursor-pointer",
              "bg-transparent border border-[#0e1f2e] text-[#39ff8a]",
              "hover:bg-[#0a1420] hover:border-[#1a3a4a]"
            )}
          >
            ▶ start
          </button>
        )}
        {sessionId && (
          <button
            type="button"
            onClick={() => {
              execPodStop(sessionId).catch(() => {});
              setSessionId(null);
              setRunning(false);
            }}
            className={cn(
              "ml-auto px-2 py-[2px] rounded text-[0.67rem] font-mono cursor-pointer",
              "bg-transparent border border-[#3a1a1a] text-[#ff6b6b]",
              "hover:bg-[#1a0a0a] hover:border-[#5a1a1a]"
            )}
          >
            ■ stop
          </button>
        )}
      </div>

      {/* Terminal output */}
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-auto p-[8px_13px] bg-[#020408]"
        )}
      >
        <pre className={cn(
          "m-0 font-mono text-[0.71rem] leading-[1.7] whitespace-pre-wrap break-all"
        )}>
          {lines.length === 0 ? (
            <span className="text-[#1e3a52]">
              {error ? "Connection failed" : 'Press "▶ start" to open a shell'}
            </span>
          ) : (
            lines.map((line, i) => {
              const color =
                line.type === "stderr"
                  ? "#ff6b6b"
                  : line.type === "error"
                  ? "#ff4444"
                  : line.type === "info"
                  ? "#1e3a52"
                  : "#bcc"; // stdout
              return (
                <span key={i} className="block">
                  <span style={{ color }}>{line.data}</span>
                </span>
              );
            })
          )}
        </pre>
      </div>

      {/* Command input */}
      {sessionId && (
        <form
          onSubmit={handleSubmit}
          className={cn(
            "flex border-t border-[#0a1018] bg-[#020408] flex-shrink-0"
          )}
        >
          <span className={cn(
            "px-[10px] py-[6px] font-mono text-[0.7rem] select-none",
            "text-[#39ff8a]"
          )}>
            $
          </span>
          <input
            ref={inputRef}
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="type a command…"
            className={cn(
              "flex-1 bg-transparent border-none outline-none",
              "text-[#ccd] font-mono text-[0.72rem] px-1 py-[6px]"
            )}
          />
        </form>
      )}
    </div>
  );
}