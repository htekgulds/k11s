use std::collections::HashMap;

use k8s_openapi::api::core::v1::{Node, Pod};
use kube::api::ListParams;
use kube::Api;
use serde::Serialize;

use crate::kube::client::{fmt_age, make_client};

#[derive(Debug, Clone, Serialize)]
pub(crate) struct NodeInfo {
    pub name: String,
    pub status: String,
    pub roles: String,
    pub version: String,
    pub cpu: String,
    pub mem: String,
    pub pods: String,
    pub age: String,
}

pub(crate) async fn pods_per_node(client: &kube::Client) -> HashMap<String, usize> {
    let pods = Api::<Pod>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map(|p| p.items)
        .unwrap_or_default();

    let mut counts: HashMap<String, usize> = HashMap::new();
    for pod in pods {
        if let Some(node) = pod.spec.as_ref().and_then(|s| s.node_name.as_ref()) {
            *counts.entry(node.clone()).or_insert(0) += 1;
        }
    }
    counts
}

pub(crate) fn node_to_info(node: Node, pod_count: usize) -> NodeInfo {
    let name = node.metadata.name.clone().unwrap_or_default();

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

    let roles: Vec<String> = node
        .metadata
        .labels
        .as_ref()
        .map(|labels| {
            labels
                .keys()
                .filter(|k| k.starts_with("node-role.kubernetes.io/"))
                .map(|k| k.trim_start_matches("node-role.kubernetes.io/").to_string())
                .collect()
        })
        .unwrap_or_default();

    let roles = if roles.is_empty() {
        "<none>".to_string()
    } else {
        roles.join(",")
    };

    let node_info = node.status.as_ref().and_then(|s| s.node_info.as_ref());
    let version = node_info
        .map(|i| i.kubelet_version.clone())
        .unwrap_or_default();
    let allocatable = node.status.as_ref().and_then(|s| s.allocatable.as_ref());
    let capacity = node.status.as_ref().and_then(|s| s.capacity.as_ref());

    let cpu = allocatable
        .and_then(|a| a.get("cpu").map(|q| q.0.clone()))
        .unwrap_or_default();
    let mem = allocatable
        .and_then(|a| a.get("memory").map(|q| q.0.clone()))
        .unwrap_or_default();
    let max_pods = capacity
        .and_then(|c| c.get("pods").map(|q| q.0.clone()))
        .unwrap_or_else(|| "?".to_string());
    let pods = format!("{pod_count}/{max_pods}");
    let age = fmt_age(&node.metadata.creation_timestamp);

    NodeInfo {
        name,
        status,
        roles,
        version,
        cpu,
        mem,
        pods,
        age,
    }
}

pub(crate) async fn list_nodes(context: Option<String>) -> Result<Vec<NodeInfo>, String> {
    let client = make_client(context).await?;
    let pod_counts = pods_per_node(&client).await;
    let nodes = Api::<Node>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list nodes: {e}"))?;

    Ok(nodes.items.into_iter().map(|n| {
        let name = n.metadata.name.clone().unwrap_or_default();
        let count = pod_counts.get(&name).copied().unwrap_or(0);
        node_to_info(n, count)
    }).collect())
}
