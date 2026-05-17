mod k8s;

#[tauri::command]
async fn list_nodes() -> Result<Vec<k8s::NodeInfo>, String> {
    k8s::list_nodes().await
}

#[tauri::command]
async fn list_pods() -> Result<Vec<k8s::PodInfo>, String> {
    k8s::list_pods().await
}

#[tauri::command]
async fn list_deployments() -> Result<Vec<k8s::DeploymentInfo>, String> {
    k8s::list_deployments().await
}

#[tauri::command]
async fn list_statefulsets() -> Result<Vec<k8s::StatefulSetInfo>, String> {
    k8s::list_statefulsets().await
}

#[tauri::command]
async fn list_services() -> Result<Vec<k8s::ServiceInfo>, String> {
    k8s::list_services().await
}

#[tauri::command]
async fn list_ingresses() -> Result<Vec<k8s::IngressInfo>, String> {
    k8s::list_ingresses().await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_nodes,
            list_pods,
            list_deployments,
            list_statefulsets,
            list_services,
            list_ingresses
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
