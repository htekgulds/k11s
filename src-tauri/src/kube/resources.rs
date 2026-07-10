/// Combined resource types: Deployment, StatefulSet, Service, Ingress, ConfigMap, Secret, PVC

use k8s_openapi::api::apps::v1::{Deployment, StatefulSet};
use k8s_openapi::api::core::v1::{ConfigMap, PersistentVolumeClaim, Secret, Service};
use k8s_openapi::api::networking::v1::Ingress;
use kube::api::ListParams;
use kube::Api;
use serde::Serialize;

use crate::kube::client::{fmt_age, make_client};

// ── Deployment ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct DeploymentInfo {
    pub name: String,
    pub namespace: String,
    pub ready: String,
    pub up_to_date: i32,
    pub available: i32,
    pub image: String,
    pub strategy: String,
    pub age: String,
}

pub(crate) fn deployment_to_info(d: Deployment) -> DeploymentInfo {
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
}

pub(crate) async fn list_deployments(context: Option<String>) -> Result<Vec<DeploymentInfo>, String> {
    let client = make_client(context).await?;
    let deps = Api::<Deployment>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list deployments: {e}"))?;

    Ok(deps.items.into_iter().map(deployment_to_info).collect())
}

// ── StatefulSet ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct StatefulSetInfo {
    pub name: String,
    pub namespace: String,
    pub ready: String,
    pub image: String,
    pub replicas: i32,
    pub age: String,
}

pub(crate) fn statefulset_to_info(s: StatefulSet) -> StatefulSetInfo {
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
}

pub(crate) async fn list_statefulsets(context: Option<String>) -> Result<Vec<StatefulSetInfo>, String> {
    let client = make_client(context).await?;
    let sts = Api::<StatefulSet>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list statefulsets: {e}"))?;

    Ok(sts.items.into_iter().map(statefulset_to_info).collect())
}

// ── Service ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ServiceInfo {
    pub name: String,
    pub namespace: String,
    #[serde(rename = "type")]
    pub service_type: String,
    pub cluster_ip: String,
    pub external_ip: String,
    pub ports: String,
    pub age: String,
}

pub(crate) fn service_to_info(s: Service) -> ServiceInfo {
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
}

pub(crate) async fn list_services(context: Option<String>) -> Result<Vec<ServiceInfo>, String> {
    let client = make_client(context).await?;
    let svcs = Api::<Service>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list services: {e}"))?;

    Ok(svcs.items.into_iter().map(service_to_info).collect())
}

// ── Ingress ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct IngressInfo {
    pub name: String,
    pub namespace: String,
    pub class: String,
    pub hosts: String,
    pub address: String,
    pub ports: String,
    pub age: String,
}

pub(crate) fn ingress_to_info(ing: Ingress) -> IngressInfo {
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
        .unwrap_or_else(|| "\u{2014}".to_string());
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
}

pub(crate) async fn list_ingresses(context: Option<String>) -> Result<Vec<IngressInfo>, String> {
    let client = make_client(context).await?;
    let ingresses = Api::<Ingress>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list ingresses: {e}"))?;

    Ok(ingresses.items.into_iter().map(ingress_to_info).collect())
}

// ── ConfigMap ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ConfigMapInfo {
    pub name: String,
    pub namespace: String,
    pub data: String,
    pub age: String,
}

pub(crate) fn configmap_to_info(cm: ConfigMap) -> ConfigMapInfo {
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
}

pub(crate) async fn list_configmaps(context: Option<String>) -> Result<Vec<ConfigMapInfo>, String> {
    let client = make_client(context).await?;
    let cms = Api::<ConfigMap>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list configmaps: {e}"))?;

    Ok(cms.items.into_iter().map(configmap_to_info).collect())
}

// ── Secret ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct SecretInfo {
    pub name: String,
    pub namespace: String,
    #[serde(rename = "type")]
    pub secret_type: String,
    pub data: String,
    pub age: String,
}

pub(crate) fn secret_to_info(sec: Secret) -> SecretInfo {
    SecretInfo {
        name: sec.metadata.name.unwrap_or_default(),
        namespace: sec.metadata.namespace.unwrap_or_default(),
        secret_type: sec.type_.clone().unwrap_or_else(|| "Opaque".to_string()),
        data: sec.data.as_ref().map(|d| d.len().to_string()).unwrap_or_default(),
        age: fmt_age(&sec.metadata.creation_timestamp),
    }
}

pub(crate) async fn list_secrets(context: Option<String>) -> Result<Vec<SecretInfo>, String> {
    let client = make_client(context).await?;
    let secrets = Api::<Secret>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list secrets: {e}"))?;

    Ok(secrets.items.into_iter().map(secret_to_info).collect())
}

// ── PersistentVolumeClaim ───────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct PvcInfo {
    pub name: String,
    pub namespace: String,
    pub status: String,
    pub volume: String,
    pub capacity: String,
    pub access_modes: String,
    pub storageclass: String,
    pub age: String,
}

pub(crate) fn pvc_to_info(pvc: PersistentVolumeClaim) -> PvcInfo {
    let status = pvc
        .status
        .as_ref()
        .and_then(|s| s.phase.clone())
        .unwrap_or_else(|| "Unknown".to_string());
    let volume = pvc
        .spec
        .as_ref()
        .and_then(|s| s.volume_name.clone())
        .unwrap_or_else(|| "\u{2014}".to_string());
    let capacity = pvc
        .status
        .as_ref()
        .and_then(|s| s.capacity.as_ref())
        .and_then(|c| c.get("storage").map(|q| q.0.clone()))
        .unwrap_or_else(|| "\u{2014}".to_string());
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
        .unwrap_or_else(|| "\u{2014}".to_string());

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
}

pub(crate) async fn list_persistentvolumeclaims(
    context: Option<String>,
) -> Result<Vec<PvcInfo>, String> {
    let client = make_client(context).await?;
    let pvcs = Api::<PersistentVolumeClaim>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list PVCs: {e}"))?;

    Ok(pvcs.items.into_iter().map(pvc_to_info).collect())
}
