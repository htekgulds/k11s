use std::fs;

use crate::kube;

#[tauri::command]
pub(crate) async fn get_yaml(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: Option<String>,
    omit_managed_fields: Option<bool>,
) -> Result<kube::YamlResponse, String> {
    kube::get_yaml(context, kind, name, namespace, omit_managed_fields.unwrap_or(false)).await
}

#[tauri::command]
pub(crate) async fn apply_yaml(
    context: Option<String>,
    yaml_content: String,
    namespace: Option<String>,
) -> Result<String, String> {
    kube::apply_yaml(context, yaml_content, namespace).await
}

#[tauri::command]
pub(crate) fn read_dropped_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {e}"))
}
