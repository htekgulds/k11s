import { useCallback, useEffect, useState } from "react";
import { k8sInvoke } from "../../api";
import { exportContent } from "../../api/export";
import { cn } from "../../utils/cn";
import { Spinner } from "../../components/ui/Spinner";

export function EventsTab({ obj, clusterId }) {
  const [events, setEvents] = useState(null);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(
    async () => {
      setFetching(true);
      try {
        const res = await k8sInvoke(
          "get_events",
          { name: obj.name, namespace: obj.namespace || null },
          clusterId,
        );
        setEvents(res);
      } catch (err) {
        setEvents({ events: [], error: String(err) });
      } finally {
        setFetching(false);
      }
    },
    [obj.name, obj.namespace, clusterId],
  );

  useEffect(() => { load(); }, [load]);

  const items = events?.events || [];
  const eventsText = items.length
    ? items
        .map(
          (ev) =>
            `[${ev.type}] ${ev.reason} (${ev.age})\n  From: ${ev.from}\n  Message: ${ev.message}`
        )
        .join("\n\n")
    : "No events";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className={cn(
        "flex items-center gap-2 px-[10px] py-[5px] border-b border-[#0e1f2e] flex-shrink-0",
        "bg-[#050910]"
      )}>
        <span className={cn("font-mono text-[0.67rem]", "text-[#7dd3fc]")}>
          events
        </span>
        {fetching && <Spinner />}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => exportContent(
            eventsText,
            `${obj.name}_events.txt`,
            [{ name: "Text", extensions: ["txt"] }],
          )}
          className={cn(
            "px-2 py-[2px] rounded text-[0.67rem] font-mono cursor-pointer",
            "bg-transparent border border-[#0e1f2e] text-[#4a7a8a]",
            "hover:bg-[#0a1420] hover:border-[#1a3a4a] hover:text-[#7dd3fc]"
          )}
          title="Export to file"
        >
          ⬇ export
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className={cn("w-full border-collapse font-mono text-[0.71rem]")}>
          <thead>
            <tr className="sticky top-0 bg-[#050910]">
              {["Type", "Reason", "Age", "From", "Message"].map((h) => (
                <th
                  key={h}
                  className={cn(
                    "text-left px-[13px] py-[7px] font-bold text-[0.61rem] uppercase tracking-[0.09em]",
                    "text-[#1e3a52] border-b border-[#0a1018]"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fetching ? (
              <tr>
                <td colSpan={5} className="p-5">
                  <div className={cn("flex items-center gap-2 font-mono text-[0.72rem]", "text-[#39ff8a]")}>
                    <Spinner /> Loading…
                  </div>
                </td>
              </tr>
            ) : (
              items.map((ev, i) => (
                <tr key={i} className="border-b border-[#080e18]">
                  <td
                    className={cn(
                      "px-[13px] py-[7px] font-bold",
                      ev.type === "Warning" ? "text-[#f5c518]" : "text-[#39ff8a]"
                    )}
                  >
                    {ev.type}
                  </td>
                  <td className="px-[13px] py-[7px] text-[#7dd3fc]">{ev.reason}</td>
                  <td className="px-[13px] py-[7px] text-[#1e3a52]">{ev.age}</td>
                  <td className="px-[13px] py-[7px] text-[#2d4a6a]">{ev.from}</td>
                  <td
                    className={cn(
                      "px-[13px] py-[7px] max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap",
                      "text-[#6a8898]"
                    )}
                  >
                    {ev.message}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}