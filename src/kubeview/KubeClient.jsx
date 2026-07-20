import { useState, useCallback, useEffect, useMemo, useRef, useDeferredValue } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Plus } from "lucide-react";
import MiniSearch from "minisearch";
import { cn } from "./utils/cn";
import { defaultNavState, COMMON_RESOURCES } from "./constants";
import { assignClusterColors, detailTabId, getClusterColor } from "./utils/clusterColors";
import {
  listClusters, getDefaultContext, getKubeconfigPaths,
  addKubeconfig, addKubeconfigByPath,
  k8sInvoke, listResource, discoverResources,
  startWatchers, stopWatchers, onResourceUpdate,
  readDroppedFile,
} from "./api";

import { useClustersStore } from "./stores";
import { useDataStore } from "./stores";
import { useNavigationStore } from "./stores";
import { useClusterHealth, useWatchers, useClock } from "./hooks";
import { useToasts, ToastContainer } from "./components/ui/Toast";

import { CommandPalette } from "./features/command-palette/CommandPalette";
import { ShortcutsModal } from "./features/layout/ShortcutsModal";
import { TopBar } from "./features/layout/TopBar";
import { Sidebar } from "./features/layout/Sidebar";
import { StatusBar } from "./features/layout/StatusBar";
import { DetailView } from "./features/detail-view/DetailView";
import { ResourceListTab } from "./features/resource-list/ResourceListTab";
import { Dashboard } from "./features/dashboard/Dashboard";
import { HelmReleasesTab } from "./features/detail-view/HelmReleasesTab";
import { PvUsageTab } from "./features/detail-view/PvUsageTab";
import { DropZoneOverlay } from "./features/yaml-drop/DropZoneOverlay";
import { YamlPreviewModal } from "./features/yaml-drop/YamlPreviewModal";

// ── Helpers ──────────────────────────────────────────────────────────────

function detailTabsOnly(tabs) {
  return tabs.filter((t) => t.type === "detail");
}

function resolveDetailObject(tab, data) {
  if (!tab || tab.type !== "detail") return null;
  const items = data[tab.resourceType] || [];
  if (tab.resourceType === "nodes")
    return items.find((r) => r.name === tab.name) || null;
  return items.find((r) => r.name === tab.name && r.namespace === tab.namespace) || null;
}

// ── Main component ────────────────────────────────────────────────────────

export default function KubeClient() {
  // ... existing state/hooks

  // ── Empty state ─────────────────────────────────────────────────────────

  if (!activeClusterId || !clusters.length) {
    const msg = clustersError || "No kubeconfig contexts found. Add a kubeconfig file or folder to get started.";
    return (
      <div className={cn(
        "flex flex-col items-center justify-center h-[100vh] gap-[16px]",
        "bg-[#060a10] text-[#4a7a8a] font-mono"
      )}>
        <div className={cn(
          "text-[0.85rem] text-center max-w-[360px] leading-[1.5]"
        )}>
          {msg}
        </div>
        <button
          type="button"
          onClick={handleAddCluster}
          className={cn(
            "flex items-center gap-2 px-5 py-[10px] rounded-lg cursor-pointer font-mono text-[0.85rem]",
            "bg-[#0e1f2e] border border-[#1a3a4a] text-[#bdd]",
            "hover:bg-[#1a3a4a] transition-colors"
          )}
        >
          <Plus size={18} /> Add Cluster
        </button>
      </div>
    );
  }

  // ... rest of component

  // ── Layout ───────────────────────────────────────────────────────────────

  return (
    <div className={cn(
      "flex flex-col h-[100vh] overflow-hidden",
      "bg-[#060a10] text-[#c8d6e5] font-mono"
    )}>
      <CommandPalette
        open={cmdOpen}
        query={cmdQuery}
        setQuery={setCmdQuery}
        items={paletteItems}
        inputRef={cmdRef}
        stale={searchStale}
        onClose={() => { setCmdOpen(false); setCmdQuery(""); }}
      />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <DropZoneOverlay isDragging={dropOver} />
      {previewContent && (
        <YamlPreviewModal
          open={true}
          yamlContent={previewContent}
          fileName={droppedFile}
          clusterId={activeClusterId}
          onClose={() => { setPreviewContent(null); setDroppedFile(null); }}
        />
      )}

      <TopBar
        clusters={clusters}
        activeCluster={activeCluster}
        onSwitchCluster={switchCluster}
        clusterState={{ ...nav, tabs: visibleTabs }}
        onTabClick={handleTabClick}
        onCloseTab={closeTab}
        onOpenPalette={() => setCmdOpen(true)}
        clock={clock}
        activeNamespace={getTF(activeClusterId).namespace || "All"}
        onNamespaceChange={(ns) => setTF(activeClusterId, { namespace: ns })}
        data={data}
        showFilter={showFilter}
        filterValue={tf.filter || ""}
        onFilterChange={handleFilterChange}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          clusterState={nav}
          activeCluster={activeCluster}
          data={data}
          loading={loading}
          onOpenResource={openResourceView}
          onAddCluster={handleAddCluster}
          onAddKubeconfigByPath={handleAddKubeconfigByPath}
          discoveredResources={discoveredResources}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">{renderMain()}</div>
        </div>
      </div>

      <StatusBar
        activeCluster={activeCluster}
        connected={connected}
        version="v0.1.0"
        kubeconfigPaths={kubeconfigPaths}
        onAddCluster={handleAddCluster}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}