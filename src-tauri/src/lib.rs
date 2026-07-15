mod clusters;
mod kube;
mod commands;
mod state;
mod watchers;

use state::{PortForwardManager, LogStreamManager};

use commands::cluster::{list_clusters, cluster_health};
use commands::resources::{list_nodes, list_deployments, list_statefulsets, list_services,
    list_ingresses, list_configmaps, list_secrets, list_persistentvolumeclaims,
    list_daemonsets, list_cronjobs, list_jobs, list_hpas};
use commands::pod::list_pods;
use commands::logs::{get_pod_logs, start_log_stream, stop_log_stream};
use commands::port_forward::{start_port_forward, stop_port_forward, list_port_forwards};
use commands::exec::{exec_pod_shell, exec_pod_stdin, exec_pod_stop};
use commands::rollout::rollout_action;
use commands::yaml::{get_yaml, apply_yaml};
use commands::describe::describe_resource;
use commands::delete::delete_resource;
use commands::events::get_events;
use commands::export::export_to_file;
use commands::dashboard::get_cluster_dashboard;
use commands::discovery::{discover_resources, list_resource};

// ── Cluster management commands (inline — thin wrappers over clusters module) ─

#[tauri::command]
fn add_kubeconfig_files(file_paths: Vec<String>) -> Result<Vec<clusters::ClusterInfo>, String> {
    clusters::add_kubeconfig_paths(&file_paths)
}

#[tauri::command]
fn add_kubeconfig_folder(folder_path: String) -> Result<Vec<clusters::ClusterInfo>, String> {
    clusters::add_kubeconfig_folder(&folder_path)
}

#[tauri::command]
fn get_kubeconfig_paths() -> Result<Vec<String>, String> {
    clusters::list_kubeconfig_paths()
}

#[tauri::command]
fn remove_kubeconfig_path(path: String) -> Result<Vec<clusters::ClusterInfo>, String> {
    clusters::remove_kubeconfig_path(&path)
}

#[tauri::command]
fn get_default_context() -> Option<String> {
    clusters::get_default_context()
}

// ── Watcher commands (need direct access to watchers::WatcherManager) ───────

#[tauri::command]
async fn start_watchers(
    app_handle: tauri::AppHandle,
    context: String,
    state: tauri::State<'_, watchers::WatcherManager>,
) -> Result<(), String> {
    use crate::kube::cluster_health;

    cluster_health(if context.is_empty() { None } else { Some(context.clone()) }).await?;
    let resource_types = [
        "pods", "nodes", "deployments", "statefulsets", "services",
        "ingresses", "configmaps", "secrets", "pvcs",
        "daemonsets", "cronjobs", "jobs", "hpas",
    ];
    for rt in resource_types {
        state.start(app_handle.clone(), context.clone(), rt.to_string()).await?;
    }
    Ok(())
}

#[tauri::command]
async fn stop_watchers(
    context: String,
    state: tauri::State<'_, watchers::WatcherManager>,
) -> Result<(), String> {
    state.stop_all(&context).await;
    Ok(())
}

// ── Application entry point ────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    clusters::apply_cli_args();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(watchers::WatcherManager::new())
        .manage(PortForwardManager::new())
        .manage(LogStreamManager::new())
        .invoke_handler(tauri::generate_handler![
            // Cluster management
            list_clusters,
            cluster_health,
            get_default_context,
            add_kubeconfig_files,
            add_kubeconfig_folder,
            get_kubeconfig_paths,
            remove_kubeconfig_path,
            // Resources
            list_nodes,
            list_pods,
            list_deployments,
            list_statefulsets,
            list_services,
            list_ingresses,
            list_configmaps,
            list_secrets,
            list_persistentvolumeclaims,
            // New resource types
            list_daemonsets,
            list_cronjobs,
            list_jobs,
            list_hpas,
            // Pod interactions
            get_pod_logs,
            start_log_stream,
            stop_log_stream,
            exec_pod_shell,
            exec_pod_stdin,
            exec_pod_stop,
            // Port forwarding
            start_port_forward,
            stop_port_forward,
            list_port_forwards,
            // YAML / describe / delete
            get_yaml,
            apply_yaml,
            describe_resource,
            delete_resource,
            get_events,
            // Rollout
            rollout_action,
            // Discovery
            discover_resources,
            list_resource,
            // Dashboard
            get_cluster_dashboard,
            // Export
            export_to_file,
            // Watchers
            start_watchers,
            stop_watchers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
