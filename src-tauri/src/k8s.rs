use k8s_openapi::api::core::v1::Node;
use kube::{api::ListParams, Api, Client, Config};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct NodeInfo {
    pub name: String,
    pub status: String,
    pub role: String,
    pub kubelet_version: String,
    pub os_image: String,
    pub cpu: String,
    pub memory: String,
}

pub async fn list_nodes() -> Result<Vec<NodeInfo>, String> {
    let config = Config::from_kubeconfig(&kube::config::KubeConfigOptions::default())
        .await
        .map_err(|e| format!("Failed to load kubeconfig: {e}"))?;

    let client = Client::try_from(config).map_err(|e| format!("Failed to create client: {e}"))?;

    let nodes = Api::<Node>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list nodes: {e}"))?;

    let infos: Vec<NodeInfo> = nodes
        .items
        .into_iter()
        .map(|node| {
            let name = node.metadata.name.unwrap_or_default();

            let status = node
                .status
                .as_ref()
                .and_then(|s| s.conditions.as_ref())
                .and_then(|conds| {
                    conds
                        .iter()
                        .find(|c| c.type_ == "Ready")
                        .map(|c| match c.status.as_str() {
                            "True" => "Ready",
                            "False" => "NotReady",
                            _ => "Unknown",
                        })
                })
                .unwrap_or("Unknown")
                .to_string();

            let role = node
                .metadata
                .labels
                .as_ref()
                .and_then(|labels| {
                    labels
                        .keys()
                        .find(|k| k.starts_with("node-role.kubernetes.io/"))
                        .map(|k| k.trim_start_matches("node-role.kubernetes.io/").to_string())
                })
                .unwrap_or_else(|| "<none>".to_string());

            let node_info = node.status.as_ref().and_then(|s| s.node_info.as_ref());

            let kubelet_version = node_info
                .map(|i| i.kubelet_version.clone())
                .unwrap_or_default();

            let os_image = node_info
                .map(|i| i.os_image.clone())
                .unwrap_or_default();

            let allocatable = node.status.as_ref().and_then(|s| s.allocatable.as_ref());

            let cpu = allocatable
                .and_then(|a| a.get("cpu").map(|q| q.0.clone()))
                .unwrap_or_default();

            let memory = allocatable
                .and_then(|a| a.get("memory").map(|q| q.0.clone()))
                .unwrap_or_default();

            NodeInfo {
                name,
                status,
                role,
                kubelet_version,
                os_image,
                cpu,
                memory,
            }
        })
        .collect();

    Ok(infos)
}
