use crate::clusters;
use crate::kube;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub(crate) struct ClusterResponse {
    pub clusters: Vec<String>,
    pub contexts: Vec<String>,
    pub current_cluster: String,
    pub current_context: String,
}

#[tauri::command]
pub(crate) async fn list_clusters() -> Result<ClusterResponse, String> {
    let kubeconfig = clusters::load_merged_kubeconfig()?;
    let clusters: Vec<String> = kubeconfig
        .clusters
        .iter()
        .map(|c| c.name.clone())
        .collect();
    let contexts: Vec<String> = kubeconfig
        .contexts
        .iter()
        .map(|c| c.name.clone())
        .collect();
    let current_cluster = kubeconfig
        .current_context
        .as_ref()
        .and_then(|cc| {
            kubeconfig.contexts.iter()
                .find(|c| c.name == *cc)
                .and_then(|c| c.context.as_ref().map(|ctx| ctx.cluster.clone()))
        })
        .unwrap_or_default();
    let current_context = kubeconfig
        .current_context
        .unwrap_or_default()
        .to_string();

    Ok(ClusterResponse {
        clusters,
        contexts,
        current_cluster,
        current_context,
    })
}

#[tauri::command]
pub(crate) async fn cluster_health(context: Option<String>) -> Result<bool, String> {
    kube::cluster_health(context).await
}
