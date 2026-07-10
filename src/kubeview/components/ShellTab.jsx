import { useCallback, useEffect, useRef, useState } from "react";
import {
  execPodShell,
  execPodStdin,
  execPodStop,
  onShellOutput,
} from "../api";
import { mono } from "../theme";

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
      const sid = await execPodShell(
        clusterId,
        obj.namespace,
        obj.name,
        null,
      );
      setSessionId(sid);
      setLines([{ type: "info", data: `Session ${sid.slice(0, 12)}… started. Type commands below.` }]);
      // Focus the input
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Toolbar */}
      <div
        style={{
          padding: "5px 13px",
          borderBottom: "1px solid #0a1018",
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "#050910",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "0.59rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#39ff8a",
            ...mono,
          }}
        >
          {running ? "🟢 shell" : "⏹ shell"}
        </span>
        {!running && !error && (
          <button
            type="button"
            onClick={startShell}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "1px solid #0e1f2e",
              borderRadius: 3,
              color: "#39ff8a",
              cursor: "pointer",
              padding: "2px 7px",
              ...mono,
              fontSize: "0.67rem",
            }}
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
            style={{
              marginLeft: "auto",
              background: "none",
              border: "1px solid #3a1a1a",
              borderRadius: 3,
              color: "#ff6b6b",
              cursor: "pointer",
              padding: "2px 7px",
              ...mono,
              fontSize: "0.67rem",
            }}
          >
            ■ stop
          </button>
        )}
      </div>

      {/* Terminal output */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "8px 13px",
          background: "#020408",
        }}
      >
        <pre
          style={{
            margin: 0,
            ...mono,
            fontSize: "0.71rem",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {lines.length === 0 ? (
            <span style={{ color: "#1e3a52" }}>
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
                <span key={i} style={{ display: "block" }}>
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
          style={{
            display: "flex",
            borderTop: "1px solid #0a1018",
            background: "#020408",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              padding: "6px 10px",
              color: "#39ff8a",
              ...mono,
              fontSize: "0.7rem",
              userSelect: "none",
            }}
          >
            $
          </span>
          <input
            ref={inputRef}
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="type a command…"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: "#ccd",
              ...mono,
              fontSize: "0.72rem",
              padding: "6px 4px",
            }}
          />
        </form>
      )}
    </div>
  );
}
