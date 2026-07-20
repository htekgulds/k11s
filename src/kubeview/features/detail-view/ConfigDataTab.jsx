import { useState, useMemo, useEffect } from "react";
import { listConfigData } from "../../api";
import { cn } from "../../utils/cn";
import { Spinner } from "../../components/ui/Spinner";

function obfuscate() {
  return "•••• (base64 encoded)";
}

function truncate(val, max = 200) {
  if (val.length <= max) return val;
  return val.slice(0, max) + "...";
}

export function ConfigDataTab({ kind, name, namespace, clusterId }) {
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [revealed, setRevealed] = useState({});

  useEffect(() => {
    if (!kind || !name || !namespace) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listConfigData(clusterId, kind, name, namespace)
      .then((data) => {
        if (!cancelled) {
          setEntries(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [kind, name, namespace, clusterId]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    if (!filter) return entries;
    const lf = filter.toLowerCase();
    return entries.filter((e) => e.key.toLowerCase().includes(lf));
  }, [entries, filter]);

  const toggleReveal = (key) => {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sourceLabel = (entry) => {
    const color = entry.source_kind === "Secret" ? "text-[#fb923c]" : "text-[#c4b5fd]";
    return { label: `${entry.source_kind}/${entry.source_name}`, color };
  };

  if (loading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center gap-2", "text-[#39ff8a] font-mono text-[0.76rem]")}>
        <Spinner /> Loading config data…
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", "text-[#ff4d4d] font-mono text-[0.76rem] p-5")}>
        {error}
      </div>
    );
  }

  return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* Filter toolbar */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-[4px] flex-shrink-0",
          "bg-[#050910] border-b border-[#080e18]"
        )}>
          <input
            type="text"
            placeholder="Filter by key…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className={cn(
              "flex-1 rounded px-2 py-[3px] font-mono text-[0.7rem] outline-none",
              "bg-[#0a1420] border border-[#12202e] text-[#d4e6f5]",
              "focus:border-[#39ff8a]"
            )}
          />
          <span className={cn("font-mono text-[0.62rem]", "text-[#0a1420]")}>
            {(entries || []).length} entries
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className={cn("w-full border-collapse font-mono text-[0.74rem]")}>
            <thead>
              <tr className={cn(
                "bg-[#050910] text-[#4a7a8a] uppercase tracking-[0.05em]",
                "text-[0.65rem] sticky top-0 z-10"
              )}>
                <th className={cn("px-[10px] py-[6px] text-left border-b border-[#080e18]")}>Key</th>
                <th className={cn("px-[10px] py-[6px] text-left border-b border-[#080e18]")}>Value</th>
                <th className={cn("px-[10px] py-[6px] text-left border-b border-[#080e18] w-[70px]")}>Binary</th>
                <th className={cn("px-[10px] py-[6px] text-left border-b border-[#080e18]")}>Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-5 text-center text-[#4a7a8a]">
                    {entries && entries.length === 0 ? "No data entries" : "No matching entries"}
                  </td>
                </tr>
              ) : (
                filtered.map((entry, i) => {
                  const src = sourceLabel(entry);
                  const isRevealed = revealed[entry.key];
                  const displayValue =
                    entry.binary || entry.source_kind === "Secret"
                      ? isRevealed
                        ? entry.value
                        : obfuscate()
                      : entry.value;
                  const showToggle = entry.binary || entry.source_kind === "Secret";
                  const shortValue = truncate(displayValue);

                  return (
                    <tr
                      key={entry.key + "-" + i}
                      className={cn(
                        "border-b border-[#080e18]",
                        i % 2 === 0 ? "bg-transparent" : "bg-white/[0.015]"
                      )}
                    >
                      <td className={cn("px-[10px] py-[5px] font-semibold text-[#d4e6f5] whitespace-nowrap")}>
                        {entry.key}
                      </td>
                      <td className={cn("px-[10px] py-[5px] text-[#a0c0d0] max-w-[400px] overflow-hidden text-ellipsis word-break-all")}>
                        {shortValue}
                        {showToggle && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(entry.key)}
                            className={cn(
                              "ml-1.5 font-mono text-[0.65rem] cursor-pointer text-[#39ff8a] underline underline-offset-1",
                              "bg-transparent border-none"
                            )}
                          >
                            {isRevealed ? "hide" : "reveal"}
                          </button>
                        )}
                      </td>
                      <td className={cn("px-[10px] py-[5px] whitespace-nowrap", entry.binary ? "text-[#fb923c]" : "text-[#4a7a8a]")}>
                        {entry.binary ? "✓" : "—"}
                      </td>
                      <td className={cn("px-[10px] py-[5px] whitespace-nowrap", src.color)}>
                        {src.label}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
}