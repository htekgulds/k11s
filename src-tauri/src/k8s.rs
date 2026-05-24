use k8s_openapi::api::apps::v1::{Deployment, StatefulSet};
use k8s_openapi::api::core::v1::{
    ConfigMap, Event, Node, PersistentVolumeClaim, Pod, Secret, Service,
};
use k8s_openapi::api::networking::v1::Ingress;
use kube::config::KubeConfigOptions;
use kube::{api::ListParams, Api, Client, Config};
use serde::Serialize;
use std::collections::HashMap;

async fn make_client(context: Option<String>) -> Result<Client, String> {
    let opts = KubeConfigOptions {
        context: context.clone(),
        ..Default::default()
    };
    let config = Config::from_kubeconfig(&opts)
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
                format!("{}h", secs / 3600)
            } else {
                format!("{}d", secs / 86400)
            }
        })
        .unwrap_or_else(|| "—".to_string())
}

fn pod_status(pod: &Pod) -> String {
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

fn container_ready(pod: &Pod) -> String {
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

fn container_restarts(pod: &Pod) -> i32 {
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

async fn pods_per_node(client: &Client) -> HashMap<String, usize> {
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

#[derive(Debug, Serialize)]
pub struct NodeInfo {
    pub name: String,
    pub status: String,
    pub roles: String,
    pub version: String,
    pub cpu: String,
    pub mem: String,
    pub pods: String,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct PodInfo {
    pub name: String,
    pub namespace: String,
    pub status: String,
    pub ready: String,
    pub restarts: i32,
    pub node: String,
    pub ip: String,
    pub image: String,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct DeploymentInfo {
    pub name: String,
    pub namespace: String,
    pub ready: String,
    pub up_to_date: i32,
    pub available: i32,
    pub image: String,
    pub strategy: String,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct StatefulSetInfo {
    pub name: String,
    pub namespace: String,
    pub ready: String,
    pub image: String,
    pub replicas: i32,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct ServiceInfo {
    pub name: String,
    pub namespace: String,
    #[serde(rename = "type")]
    pub service_type: String,
    pub cluster_ip: String,
    pub external_ip: String,
    pub ports: String,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct IngressInfo {
    pub name: String,
    pub namespace: String,
    pub class: String,
    pub hosts: String,
    pub address: String,
    pub ports: String,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct ConfigMapInfo {
    pub name: String,
    pub namespace: String,
    pub data: String,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct SecretInfo {
    pub name: String,
    pub namespace: String,
    #[serde(rename = "type")]
    pub secret_type: String,
    pub data: String,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct PvcInfo {
    pub name: String,
    pub namespace: String,
    pub status: String,
    pub volume: String,
    pub capacity: String,
    pub access_modes: String,
    pub storageclass: String,
    pub age: String,
}

#[derive(Debug, Serialize)]
pub struct EventInfo {
    #[serde(rename = "type")]
    pub event_type: String,
    pub reason: String,
    pub age: String,
    pub from: String,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct PodLogsResponse {
    pub logs: String,
}

#[derive(Debug, Serialize)]
pub struct YamlResponse {
    pub yaml: String,
}

#[derive(Debug, Serialize)]
pub struct EventsResponse {
    pub events: Vec<EventInfo>,
}

pub async fn list_nodes(context: Option<String>) -> Result<Vec<NodeInfo>, String> {
    let client = make_client(context).await?;
    let pod_counts = pods_per_node(&client).await;

    let nodes = Api::<Node>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list nodes: {e}"))?;

    let infos: Vec<NodeInfo> = nodes
        .items
        .into_iter()
        .map(|node| {
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
            let used = pod_counts.get(&name).copied().unwrap_or(0);
            let pods = format!("{used}/{max_pods}");
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
        })
        .collect();

    Ok(infos)
}

pub async fn list_pods(context: Option<String>) -> Result<Vec<PodInfo>, String> {
    let client = make_client(context).await?;
    let pods = Api::<Pod>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list pods: {e}"))?;

    let infos: Vec<PodInfo> = pods
        .items
        .into_iter()
        .map(|pod| {
            let name = pod.metadata.name.clone().unwrap_or_default();
            let namespace = pod.metadata.namespace.clone().unwrap_or_default();
            let node = pod
                .spec
                .as_ref()
                .and_then(|s| s.node_name.clone())
                .unwrap_or_default();
            let ip = pod
                .status
                .as_ref()
                .and_then(|s| s.pod_ip.clone())
                .unwrap_or_default();

            PodInfo {
                name,
                namespace,
                status: pod_status(&pod),
                ready: container_ready(&pod),
                restarts: container_restarts(&pod),
                node,
                ip,
                image: first_container_image(&pod),
                age: fmt_age(&pod.metadata.creation_timestamp),
            }
        })
        .collect();

    Ok(infos)
}

pub async fn list_deployments(context: Option<String>) -> Result<Vec<DeploymentInfo>, String> {
    let client = make_client(context).await?;
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
            let desired = d.spec.as_ref().and_then(|s| s.replicas).unwrap_or(0);
            let (ready_replicas, up_to_date, available) = d
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
            let image = d
                .spec
                .as_ref()
                .and_then(|s| s.template.spec.as_ref())
                .and_then(|ps| ps.containers.first())
                .and_then(|c| c.image.clone())
                .unwrap_or_default();
            let strategy = d
                .spec
                .as_ref()
                .and_then(|s| s.strategy.as_ref())
                .and_then(|st| st.type_.clone())
                .unwrap_or_else(|| "RollingUpdate".to_string());

            DeploymentInfo {
                name,
                namespace,
                ready: format!("{ready_replicas}/{desired}"),
                up_to_date,
                available,
                image,
                strategy,
                age: fmt_age(&d.metadata.creation_timestamp),
            }
        })
        .collect();

    Ok(infos)
}

pub async fn list_statefulsets(context: Option<String>) -> Result<Vec<StatefulSetInfo>, String> {
    let client = make_client(context).await?;
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
            let replicas = s.spec.as_ref().and_then(|sp| sp.replicas).unwrap_or(0);
            let ready_replicas = s
                .status
                .as_ref()
                .map(|st| st.ready_replicas.unwrap_or(0))
                .unwrap_or(0);
            let image = s
                .spec
                .as_ref()
                .and_then(|sp| sp.template.spec.as_ref())
                .and_then(|ps| ps.containers.first())
                .and_then(|c| c.image.clone())
                .unwrap_or_default();

            StatefulSetInfo {
                name,
                namespace,
                ready: format!("{ready_replicas}/{replicas}"),
                image,
                replicas,
                age: fmt_age(&s.metadata.creation_timestamp),
            }
        })
        .collect();

    Ok(infos)
}

pub async fn list_services(context: Option<String>) -> Result<Vec<ServiceInfo>, String> {
    let client = make_client(context).await?;
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
                .and_then(|sp| sp.cluster_ip.clone())
                .unwrap_or_default();
            let external_ip = s
                .status
                .as_ref()
                .and_then(|st| st.load_balancer.as_ref())
                .and_then(|lb| lb.ingress.as_ref())
                .and_then(|ing| ing.first())
                .and_then(|i| i.ip.clone().or_else(|| i.hostname.clone()))
                .unwrap_or_else(|| "<none>".to_string());
            let ports = s
                .spec
                .as_ref()
                .and_then(|sp| sp.ports.as_ref())
                .map(|ports| {
                    ports
                        .iter()
                        .map(|p| {
                            let port = p.port;
                            let proto = p.protocol.as_deref().unwrap_or("TCP");
                            let node_port = p.node_port.map(|np| format!(":{np}")).unwrap_or_default();
                            format!("{port}{node_port}/{proto}")
                        })
                        .collect::<Vec<_>>()
                        .join(",")
                })
                .unwrap_or_default();

            ServiceInfo {
                name,
                namespace,
                service_type,
                cluster_ip,
                external_ip,
                ports,
                age: fmt_age(&s.metadata.creation_timestamp),
            }
        })
        .collect();

    Ok(infos)
}

pub async fn list_ingresses(context: Option<String>) -> Result<Vec<IngressInfo>, String> {
    let client = make_client(context).await?;
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
            let class = ing
                .spec
                .as_ref()
                .and_then(|sp| sp.ingress_class_name.clone())
                .unwrap_or_else(|| "default".to_string());
            let hosts = ing
                .spec
                .as_ref()
                .and_then(|sp| sp.rules.as_ref())
                .map(|rules| {
                    rules
                        .iter()
                        .filter_map(|r| r.host.clone())
                        .collect::<Vec<_>>()
                        .join(",")
                })
                .unwrap_or_default();
            let address = ing
                .status
                .as_ref()
                .and_then(|st| st.load_balancer.as_ref())
                .and_then(|lb| lb.ingress.as_ref())
                .and_then(|entries| entries.first())
                .and_then(|i| i.ip.clone().or_else(|| i.hostname.clone()))
                .unwrap_or_else(|| "—".to_string());
            let ports = ing
                .spec
                .as_ref()
                .and_then(|sp| sp.tls.as_ref())
                .map(|tls| {
                    if tls.is_empty() {
                        "80".to_string()
                    } else {
                        "80,443".to_string()
                    }
                })
                .unwrap_or_else(|| "80".to_string());

            IngressInfo {
                name,
                namespace,
                class,
                hosts,
                address,
                ports,
                age: fmt_age(&ing.metadata.creation_timestamp),
            }
        })
        .collect();

    Ok(infos)
}

pub async fn list_configmaps(context: Option<String>) -> Result<Vec<ConfigMapInfo>, String> {
    let client = make_client(context).await?;
    let cms = Api::<ConfigMap>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list configmaps: {e}"))?;

    let infos: Vec<ConfigMapInfo> = cms
        .items
        .into_iter()
        .map(|cm| {
            let data_count = cm
                .data
                .as_ref()
                .map(|d| d.len())
                .or_else(|| cm.binary_data.as_ref().map(|d| d.len()))
                .unwrap_or(0);
            ConfigMapInfo {
                name: cm.metadata.name.unwrap_or_default(),
                namespace: cm.metadata.namespace.unwrap_or_default(),
                data: data_count.to_string(),
                age: fmt_age(&cm.metadata.creation_timestamp),
            }
        })
        .collect();

    Ok(infos)
}

pub async fn list_secrets(context: Option<String>) -> Result<Vec<SecretInfo>, String> {
    let client = make_client(context).await?;
    let secrets = Api::<Secret>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list secrets: {e}"))?;

    let infos: Vec<SecretInfo> = secrets
        .items
        .into_iter()
        .map(|sec| {
            let data_count = sec.data.as_ref().map(|d| d.len()).unwrap_or(0);
            SecretInfo {
                name: sec.metadata.name.unwrap_or_default(),
                namespace: sec.metadata.namespace.unwrap_or_default(),
                secret_type: sec
                    .type_
                    .clone()
                    .unwrap_or_else(|| "Opaque".to_string()),
                data: data_count.to_string(),
                age: fmt_age(&sec.metadata.creation_timestamp),
            }
        })
        .collect();

    Ok(infos)
}

pub async fn list_persistentvolumeclaims(
    context: Option<String>,
) -> Result<Vec<PvcInfo>, String> {
    let client = make_client(context).await?;
    let pvcs = Api::<PersistentVolumeClaim>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list PVCs: {e}"))?;

    let infos: Vec<PvcInfo> = pvcs
        .items
        .into_iter()
        .map(|pvc| {
            let status = pvc
                .status
                .as_ref()
                .and_then(|s| s.phase.clone())
                .unwrap_or_else(|| "Unknown".to_string());
            let volume = pvc
                .spec
                .as_ref()
                .and_then(|s| s.volume_name.clone())
                .unwrap_or_else(|| "—".to_string());
            let capacity = pvc
                .status
                .as_ref()
                .and_then(|s| s.capacity.as_ref())
                .and_then(|c| c.get("storage").map(|q| q.0.clone()))
                .unwrap_or_else(|| "—".to_string());
            let access_modes = pvc
                .spec
                .as_ref()
                .and_then(|s| s.access_modes.as_ref())
                .map(|modes| modes.join(","))
                .unwrap_or_default();
            let storageclass = pvc
                .spec
                .as_ref()
                .and_then(|s| s.storage_class_name.clone())
                .unwrap_or_else(|| "—".to_string());

            PvcInfo {
                name: pvc.metadata.name.unwrap_or_default(),
                namespace: pvc.metadata.namespace.unwrap_or_default(),
                status,
                volume,
                capacity,
                access_modes,
                storageclass,
                age: fmt_age(&pvc.metadata.creation_timestamp),
            }
        })
        .collect();

    Ok(infos)
}

pub async fn get_pod_logs(
    context: Option<String>,
    name: String,
    namespace: String,
) -> Result<PodLogsResponse, String> {
    let client = make_client(context).await?;
    let pods: Api<Pod> = Api::namespaced(client, &namespace);
    let logs = pods
        .logs(&name, &kube::api::LogParams::default())
        .await
        .map_err(|e| format!("Failed to get logs: {e}"))?;
    Ok(PodLogsResponse { logs })
}

pub async fn get_yaml(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: Option<String>,
) -> Result<YamlResponse, String> {
    let client = make_client(context).await?;
    let yaml = match kind.as_str() {
        "pods" | "Pod" => {
            let ns = namespace.ok_or("namespace required for pods")?;
            let obj = Api::<Pod>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get pod: {e}"))?;
            serde_yaml::to_string(&obj).map_err(|e| e.to_string())?
        }
        "deployments" | "Deployment" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Deployment>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get deployment: {e}"))?;
            serde_yaml::to_string(&obj).map_err(|e| e.to_string())?
        }
        "statefulsets" | "StatefulSet" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<StatefulSet>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get statefulset: {e}"))?;
            serde_yaml::to_string(&obj).map_err(|e| e.to_string())?
        }
        "services" | "Service" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Service>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get service: {e}"))?;
            serde_yaml::to_string(&obj).map_err(|e| e.to_string())?
        }
        "ingresses" | "Ingress" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Ingress>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get ingress: {e}"))?;
            serde_yaml::to_string(&obj).map_err(|e| e.to_string())?
        }
        "configmaps" | "ConfigMap" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<ConfigMap>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get configmap: {e}"))?;
            serde_yaml::to_string(&obj).map_err(|e| e.to_string())?
        }
        "secrets" | "Secret" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<Secret>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get secret: {e}"))?;
            serde_yaml::to_string(&obj).map_err(|e| e.to_string())?
        }
        "pvcs" | "PersistentVolumeClaim" => {
            let ns = namespace.ok_or("namespace required")?;
            let obj = Api::<PersistentVolumeClaim>::namespaced(client, &ns)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get PVC: {e}"))?;
            serde_yaml::to_string(&obj).map_err(|e| e.to_string())?
        }
        "nodes" | "Node" => {
            let obj = Api::<Node>::all(client)
                .get(&name)
                .await
                .map_err(|e| format!("Failed to get node: {e}"))?;
            serde_yaml::to_string(&obj).map_err(|e| e.to_string())?
        }
        other => return Err(format!("Unsupported kind: {other}")),
    };
    Ok(YamlResponse { yaml })
}

pub async fn get_events(
    context: Option<String>,
    name: String,
    namespace: Option<String>,
) -> Result<EventsResponse, String> {
    let client = make_client(context).await?;
    let events = Api::<Event>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list events: {e}"))?;

    let filtered: Vec<EventInfo> = events
        .items
        .into_iter()
        .filter(|ev| {
            let obj = &ev.involved_object;
            obj.name.as_deref() == Some(name.as_str())
                && (namespace.is_none()
                    || obj.namespace.as_deref() == namespace.as_deref())
        })
        .map(|ev| {
            let from = ev
                .source
                .as_ref()
                .and_then(|s| s.component.clone())
                .unwrap_or_else(|| "—".to_string());
            EventInfo {
                event_type: ev.type_.clone().unwrap_or_else(|| "Normal".to_string()),
                reason: ev.reason.clone().unwrap_or_default(),
                age: fmt_age(&ev.metadata.creation_timestamp),
                from,
                message: ev.message.clone().unwrap_or_default(),
            }
        })
        .collect();

    Ok(EventsResponse { events: filtered })
}
