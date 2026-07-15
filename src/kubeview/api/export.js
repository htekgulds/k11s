import { save } from "@tauri-apps/plugin-dialog";
import { k8sInvoke } from "./resources";

/**
 * Open native save dialog and write content to the selected file.
 * Returns the saved path, or null if cancelled.
 */
export async function exportContent(content, defaultName, filters) {
  const path = await save({
    defaultPath: defaultName,
    filters: filters || [{ name: "All Files", extensions: ["*"] }],
  });
  if (!path) return null;
  await k8sInvoke("export_to_file", { content, path });
  return path;
}
