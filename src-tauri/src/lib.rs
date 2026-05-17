mod k8s;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn list_nodes() -> Result<Vec<k8s::NodeInfo>, String> {
    k8s::list_nodes().await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, list_nodes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
