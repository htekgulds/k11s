import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export async function startWatchers(clusterId) {
  return invoke("start_watchers", { context: clusterId || "" });
}

export async function stopWatchers(clusterId) {
  return invoke("stop_watchers", { context: clusterId || "" });
}

export async function onResourceUpdate(callback) {
  return listen("resource-update", (event) => {
    callback(event.payload);
  });
}
