use std::fs;

#[tauri::command]
pub(crate) fn export_to_file(content: String, path: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {e}"))
}
