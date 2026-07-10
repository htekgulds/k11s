import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export function execPodShell(context, namespace, pod, container) {
  return invoke("exec_pod_shell", {
    context: context ?? null, namespace, pod, container: container ?? null,
  });
}

export function execPodStdin(sessionId, data) {
  return invoke("exec_pod_stdin", { sessionId, data });
}

export function execPodStop(sessionId) {
  return invoke("exec_pod_stop", { sessionId });
}

export async function onShellOutput(callback) {
  return listen("shell-output", (event) => {
    callback(event.payload);
  });
}
