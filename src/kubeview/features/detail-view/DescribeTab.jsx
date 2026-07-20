import { useState, useEffect, useCallback } from "react";
import { k8sInvoke } from "../../api";
import { exportContent } from "../../api/export";
import { cn } from "../../utils/cn";
import { Spinner } from "../../components/ui/Spinner";

export function DescribeTab({ obj, clusterId }) {
  const [describe, setDescribe] = useState(null);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await k8sInvoke(
        "describe_resource",
        { kind: obj.resourceType, name: obj.name, namespace: obj.namespace },
        clusterId,
      );
      setDescribe(res.describe);
    } catch (e) {
      setDescribe(`Error: ${e}`);
    } finally {
      setFetching(false);
    }
  }, [obj.name, obj.namespace, obj.resourceType, clusterId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className={cn(
        "flex items-center gap-2 px-[10px] py-[6px] flex-shrink-0",
        "bg-[#050910] border-b border-[#0e1f2e]"
      )}>
        <span className={cn("font-mono text-[0.67rem]", "text-[#fbbf24]")}>
          describe
        </span>
        {fetching && <Spinner />}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => exportContent(
            describe || "",
            `${obj.name}_describe.txt`,
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
      <div className={cn(
        "flex-1 overflow-auto p-[10px_13px] whitespace-pre-wrap font-mono",
        "text-[0.7rem] leading-[1.5] text-[#bcc]"
      )}>
        {fetching && !describe ? "Loading…" : describe}
      </div>
    </div>
  );
}