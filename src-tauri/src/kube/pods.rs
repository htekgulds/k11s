use k8s_openapi::api::core::v1::Pod;
use kube::api::ListParams;
use kube::Api;
use serde::Serialize;

use crate::kube::client::{fmt_age, make_client};

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ContainerInfo {
    pub name: String,
    pub image: String,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct PodInfo {
    pub name: String,
    pub namespace: String,
    pub status: String,
    pub ready: String,
    pub restarts: i32,
    pub node: String,
    pub ip: String,
    pub image: String,
    pub age: String,
    pub containers: Vec<ContainerInfo>,
}

pub(crate) fn pod_status(pod: &Pod) -> String {
    if pod.metadata.deletion_timestamp.is_some() {
        return "Terminating".to_string();
    }
    if let Some(statuses) = pod
        .status
        .as_ref()
        .and_then(|s| s.container_statuses.as_ref())
    {
        for cs in statuses {
            if let Some(state) = &cs.state {
                if let Some(waiting) = &state.waiting {
                    if let Some(reason) = &waiting.reason {
                        return reason.clone();
                    }
                }
                if let Some(terminated) = &state.terminated {
                    if let Some(reason) = &terminated.reason {
                        return reason.clone();
                    }
                }
            }
        }
    }
    pod.status
        .as_ref()
        .and_then(|s| s.phase.clone())
        .unwrap_or_else(|| "Unknown".to_string())
}

pub(crate) fn container_ready(pod: &Pod) -> String {
    pod.status
        .as_ref()
        .and_then(|s| s.container_statuses.as_ref())
        .map(|statuses| {
            let total = statuses.len();
            let ready = statuses.iter().filter(|c| c.ready).count();
            format!("{ready}/{total}")
        })
        .unwrap_or_else(|| "0/0".to_string())
}

pub(crate) fn container_restarts(pod: &Pod) -> i32 {
    pod.status
        .as_ref()
        .and_then(|s| s.container_statuses.as_ref())
        .map(|statuses| statuses.iter().map(|c| c.restart_count).sum())
        .unwrap_or(0)
}

fn first_container_image(pod: &Pod) -> String {
    pod.spec
        .as_ref()
        .and_then(|s| s.containers.first())
        .map(|c| c.image.clone().unwrap_or_default())
        .unwrap_or_default()
}

pub(crate) fn pod_to_info(pod: Pod) -> PodInfo {
    PodInfo {
        name: pod.metadata.name.clone().unwrap_or_default(),
        namespace: pod.metadata.namespace.clone().unwrap_or_default(),
        status: pod_status(&pod),
        ready: container_ready(&pod),
        restarts: container_restarts(&pod),
        node: pod.spec.as_ref().and_then(|s| s.node_name.clone()).unwrap_or_default(),
        ip: pod.status.as_ref().and_then(|s| s.pod_ip.clone()).unwrap_or_default(),
        image: first_container_image(&pod),
        age: fmt_age(&pod.metadata.creation_timestamp),
        containers: pod.spec.as_ref().map(|s| {
            s.containers.iter().map(|c| ContainerInfo {
                name: c.name.clone(),
                image: c.image.clone().unwrap_or_default(),
            }).collect()
        }).unwrap_or_default(),
    }
}

pub(crate) async fn list_pods(context: Option<String>) -> Result<Vec<PodInfo>, String> {
    let client = make_client(context).await?;
    let pods = Api::<Pod>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list pods: {e}"))?;

    Ok(pods.items.into_iter().map(pod_to_info).collect())
}
