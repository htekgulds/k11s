use k8s_openapi::api::apps::v1::{Deployment, StatefulSet};
use k8s_openapi::api::core::v1::{Node, Pod, Service};
use k8s_openapi::api::networking::v1::Ingress;
use kube::{api::ListParams, Api, Client, Config};
use serde::Serialize;

async fn make_client() -> Result<Client, String> {
    let config = Config::from_kubeconfig(&kube::config::KubeConfigOptions::default())
        .await
        .map_err(|e| format!("Failed to load kubeconfig: {e}"))?;
    Client::try_from(config).map_err(|e| format!("Failed to create client: {e}"))
}

fn fmt_age(ts: &Option<k8s_openapi::apimachinery::pkg::apis::meta::v1::Time>) -> String {
    ts.as_ref()
        .and_then(|t| {
            chrono::Utc::now()
                .signed_duration_since(t.0)
                .to_std()
                .ok()
        })
        .map(|d| {
            let secs = d.as_secs();
            if secs < 60 {
                format!("{secs}s")
            } else if secs < 3600 {
                format!("{}m", secs / 60)
            } else if secs < 86400 {
                format!("{}h{}m", secs / 3600, (secs % 3600) / 60)
            } else {
                format!("{}d", secs / 86400)
            }
        })
        .unwrap_or_default()
}

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

#[derive(Debug, Serialize)]
pub struct PodInfo {
    pub name: String,
    pub namespace: String,
    pub status: String,
    pub node: String,
    pub age: String,
    pub containers: String,
}

#[derive(Debug, Serialize)]
pub struct DeploymentInfo {
    pub name: String,
    pub namespace: String,
    pub desired: i32,
    pub ready: i32,
    pub up_to_date: i32,
    pub available: i32,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct StatefulSetInfo {
    pub name: String,
    pub namespace: String,
    pub ready: i32,
    pub desired: i32,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct ServiceInfo {
    pub name: String,
    pub namespace: String,
    pub service_type: String,
    pub cluster_ip: String,
    pub ports: String,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct IngressInfo {
    pub name: String,
    pub namespace: String,
    pub hosts: String,
    pub age: String,
}

pub async fn list_nodes() -> Result<Vec<NodeInfo>, String> {
    let client = make_client().await?;

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

pub async fn list_pods() -> Result<Vec<PodInfo>, String> {
    let client = make_client().await?;

    let pods = Api::<Pod>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list pods: {e}"))?;

    let infos: Vec<PodInfo> = pods
        .items
        .into_iter()
        .map(|pod| {
            let name = pod.metadata.name.unwrap_or_default();
            let namespace = pod.metadata.namespace.unwrap_or_default();
            let node = pod
                .spec
                .as_ref()
                .and_then(|s| s.node_name.clone())
                .unwrap_or_default();

            let status = pod
                .status
                .as_ref()
                .and_then(|s| s.phase.clone())
                .unwrap_or_else(|| "Unknown".to_string());

            let containers = pod
                .status
                .as_ref()
                .and_then(|s| s.container_statuses.as_ref())
                .map(|statuses| {
                    let total = statuses.len();
                    let ready = statuses.iter().filter(|c| c.ready).count();
                    format!("{ready}/{total}")
                })
                .unwrap_or_else(|| "0/0".to_string());

            let age = fmt_age(&pod.metadata.creation_timestamp);

            PodInfo {
                name,
                namespace,
                status,
                node,
                age,
                containers,
            }
        })
        .collect();

    Ok(infos)
}

pub async fn list_deployments() -> Result<Vec<DeploymentInfo>, String> {
    let client = make_client().await?;

    let deps = Api::<Deployment>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list deployments: {e}"))?;

    let infos: Vec<DeploymentInfo> = deps
        .items
        .into_iter()
        .map(|d| {
            let name = d.metadata.name.unwrap_or_default();
            let namespace = d.metadata.namespace.unwrap_or_default();
            let desired = d.spec.as_ref().map(|s| s.replicas.unwrap_or(0)).unwrap_or(0);
            let (ready, up_to_date, available) = d
                .status
                .as_ref()
                .map(|s| {
                    (
                        s.ready_replicas.unwrap_or(0),
                        s.updated_replicas.unwrap_or(0),
                        s.available_replicas.unwrap_or(0),
                    )
                })
                .unwrap_or((0, 0, 0));
            let age = fmt_age(&d.metadata.creation_timestamp);

            DeploymentInfo {
                name,
                namespace,
                desired,
                ready,
                up_to_date,
                available,
                age,
            }
        })
        .collect();

    Ok(infos)
}

pub async fn list_statefulsets() -> Result<Vec<StatefulSetInfo>, String> {
    let client = make_client().await?;

    let sts = Api::<StatefulSet>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list statefulsets: {e}"))?;

    let infos: Vec<StatefulSetInfo> = sts
        .items
        .into_iter()
        .map(|s| {
            let name = s.metadata.name.unwrap_or_default();
            let namespace = s.metadata.namespace.unwrap_or_default();
            let desired = s.spec.as_ref().map(|sp| sp.replicas.unwrap_or(0)).unwrap_or(0);
            let ready = s
                .status
                .as_ref()
                .map(|st| st.ready_replicas.unwrap_or(0))
                .unwrap_or(0);
            let age = fmt_age(&s.metadata.creation_timestamp);

            StatefulSetInfo {
                name,
                namespace,
                ready,
                desired,
                age,
            }
        })
        .collect();

    Ok(infos)
}

pub async fn list_services() -> Result<Vec<ServiceInfo>, String> {
    let client = make_client().await?;

    let svcs = Api::<Service>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list services: {e}"))?;

    let infos: Vec<ServiceInfo> = svcs
        .items
        .into_iter()
        .map(|s| {
            let name = s.metadata.name.unwrap_or_default();
            let namespace = s.metadata.namespace.unwrap_or_default();
            let service_type = s
                .spec
                .as_ref()
                .and_then(|sp| sp.type_.clone())
                .unwrap_or_else(|| "ClusterIP".to_string());
            let cluster_ip = s
                .spec
                .as_ref()
                .map(|sp| sp.cluster_ip.clone().unwrap_or_default())
                .unwrap_or_default();
            let ports = s
                .spec
                .as_ref()
                .map(|sp| {
                    sp.ports
                        .as_ref()
                        .map(|ports| {
                            ports
                                .iter()
                                .map(|p| {
                                    let port = p.port;
                                    let proto = p.protocol.as_deref().unwrap_or("TCP");
                                    let name = p.name.as_deref().unwrap_or("");
                                    if name.is_empty() {
                                        format!("{port}/{proto}")
                                    } else {
                                        format!("{name}:{port}/{proto}")
                                    }
                                })
                                .collect::<Vec<_>>()
                                .join(", ")
                        })
                        .unwrap_or_default()
                })
                .unwrap_or_default();
            let age = fmt_age(&s.metadata.creation_timestamp);

            ServiceInfo {
                name,
                namespace,
                service_type,
                cluster_ip,
                ports,
                age,
            }
        })
        .collect();

    Ok(infos)
}

pub async fn list_ingresses() -> Result<Vec<IngressInfo>, String> {
    let client = make_client().await?;

    let ingresses = Api::<Ingress>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list ingresses: {e}"))?;

    let infos: Vec<IngressInfo> = ingresses
        .items
        .into_iter()
        .map(|ing| {
            let name = ing.metadata.name.unwrap_or_default();
            let namespace = ing.metadata.namespace.unwrap_or_default();
            let hosts = ing
                .spec
                .as_ref()
                .and_then(|sp| sp.rules.as_ref())
                .map(|rules| {
                    rules
                        .iter()
                        .filter_map(|r| r.host.clone())
                        .collect::<Vec<_>>()
                        .join(", ")
                })
                .unwrap_or_default();
            let age = fmt_age(&ing.metadata.creation_timestamp);

            IngressInfo {
                name,
                namespace,
                hosts,
                age,
            }
        })
        .collect();

    Ok(infos)
}
