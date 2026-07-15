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

// ── DaemonSet ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct DaemonSetInfo {
    pub name: String,
    pub namespace: String,
    pub desired: i32,
    pub current: i32,
    pub ready: i32,
    pub available: i32,
    pub up_to_date: i32,
    pub node_selector: String,
    pub age: String,
}

pub(crate) fn daemonset_to_info(ds: k8s_openapi::api::apps::v1::DaemonSet) -> DaemonSetInfo {
    let name = ds.metadata.name.unwrap_or_default();
    let namespace = ds.metadata.namespace.unwrap_or_default();
    let desired = ds.status.as_ref().map(|s| s.desired_number_scheduled).unwrap_or(0);
    let current = ds.status.as_ref().map(|s| s.current_number_scheduled).unwrap_or(0);
    let ready = ds.status.as_ref().map(|s| s.number_ready).unwrap_or(0);
    let available = ds.status.as_ref().and_then(|s| s.number_available).unwrap_or(0);
    let up_to_date = ds.status.as_ref().and_then(|s| s.updated_number_scheduled).unwrap_or(0);
    let node_selector = ds.spec.as_ref()
        .and_then(|s| s.template.spec.as_ref())
        .and_then(|ps| ps.node_selector.as_ref())
        .map(|ns| {
            ns.iter().map(|(k, v)| format!("{k}={v}")).collect::<Vec<_>>().join(",")
        })
        .unwrap_or_default();
    DaemonSetInfo {
        name,
        namespace,
        desired,
        current,
        ready,
        available,
        up_to_date,
        node_selector,
        age: fmt_age(&ds.metadata.creation_timestamp),
    }
}

pub(crate) async fn list_daemonsets(context: Option<String>) -> Result<Vec<DaemonSetInfo>, String> {
    let client = make_client(context).await?;
    let dss = Api::<k8s_openapi::api::apps::v1::DaemonSet>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list daemonsets: {e}"))?;
    Ok(dss.items.into_iter().map(daemonset_to_info).collect())
}

// ── CronJob ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct CronJobInfo {
    pub name: String,
    pub namespace: String,
    pub schedule: String,
    pub suspend: bool,
    pub last_schedule: String,
    pub age: String,
}

pub(crate) fn cronjob_to_info(cj: k8s_openapi::api::batch::v1::CronJob) -> CronJobInfo {
    let name = cj.metadata.name.unwrap_or_default();
    let namespace = cj.metadata.namespace.unwrap_or_default();
    let schedule = cj.spec.as_ref().map(|s| s.schedule.clone()).unwrap_or_default();
    let suspend = cj.spec.as_ref().and_then(|s| s.suspend).unwrap_or(false);
    use k8s_openapi::apimachinery::pkg::apis::meta::v1::Time as K8sTime;
    let last_schedule = cj.status.as_ref()
        .and_then(|s| s.last_schedule_time.as_ref())
        .map(|t| fmt_age(&Some(K8sTime(t.0.clone()))))
        .unwrap_or_else(|| "—".to_string());
    CronJobInfo {
        name,
        namespace,
        schedule,
        suspend,
        last_schedule,
        age: fmt_age(&cj.metadata.creation_timestamp),
    }
}

pub(crate) async fn list_cronjobs(context: Option<String>) -> Result<Vec<CronJobInfo>, String> {
    let client = make_client(context).await?;
    let cjs = Api::<k8s_openapi::api::batch::v1::CronJob>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list cronjobs: {e}"))?;
    Ok(cjs.items.into_iter().map(cronjob_to_info).collect())
}

// ── Job ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct JobInfo {
    pub name: String,
    pub namespace: String,
    pub completions: String,
    pub parallelism: i32,
    pub duration: String,
    pub conditions: String,
    pub age: String,
}

pub(crate) fn job_to_info(j: k8s_openapi::api::batch::v1::Job) -> JobInfo {
    let name = j.metadata.name.unwrap_or_default();
    let namespace = j.metadata.namespace.unwrap_or_default();
    let completions = j.status.as_ref()
        .map(|s| {
            let succeed = s.succeeded.unwrap_or(0);
            let desired = j.spec.as_ref().and_then(|sp| sp.completions).unwrap_or(1);
            format!("{succeed}/{desired}")
        })
        .unwrap_or_else(|| "0/1".to_string());
    let parallelism = j.spec.as_ref().and_then(|sp| sp.parallelism).unwrap_or(1);
    let duration = j.status.as_ref()
        .and_then(|s| {
            let start = s.start_time.as_ref()?;
            let end = s.completion_time.as_ref()?;
            let dur = end.0.signed_duration_since(start.0.clone());
            let secs = dur.num_seconds();
            Some(if secs < 60 {
                format!("{secs}s")
            } else {
                format!("{}m{}s", secs / 60, secs % 60)
            })
        })
        .unwrap_or_else(|| "running".to_string());
    let conditions = j.status.as_ref()
        .and_then(|s| s.conditions.as_ref())
        .map(|conds| conds.iter()
            .filter(|c| c.status == "True")
            .map(|c| c.type_.clone())
            .collect::<Vec<_>>()
            .join(","))
        .unwrap_or_default();
    JobInfo {
        name,
        namespace,
        completions,
        parallelism,
        duration,
        conditions,
        age: fmt_age(&j.metadata.creation_timestamp),
    }
}

pub(crate) async fn list_jobs(context: Option<String>) -> Result<Vec<JobInfo>, String> {
    let client = make_client(context).await?;
    let jobs = Api::<k8s_openapi::api::batch::v1::Job>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list jobs: {e}"))?;
    Ok(jobs.items.into_iter().map(job_to_info).collect())
}

// ── HorizontalPodAutoscaler ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct HpaInfo {
    pub name: String,
    pub namespace: String,
    pub min: i32,
    pub max: i32,
    pub replicas: i32,
    pub target: String,
    pub age: String,
}

pub(crate) fn hpa_to_info(hpa: k8s_openapi::api::autoscaling::v2::HorizontalPodAutoscaler) -> HpaInfo {
    let name = hpa.metadata.name.unwrap_or_default();
    let namespace = hpa.metadata.namespace.unwrap_or_default();
    let min = hpa.spec.as_ref().map(|s| s.min_replicas.unwrap_or(1)).unwrap_or(1);
    let max = hpa.spec.as_ref().map(|s| s.max_replicas).unwrap_or(1);
    let replicas = hpa.status.as_ref().and_then(|s| s.current_replicas).unwrap_or(0);
    let target = hpa.spec.as_ref()
        .and_then(|s| s.metrics.as_ref())
        .map(|metrics| {
            metrics.iter().filter_map(|m| {
                if let Some(r) = &m.resource {
                    let name = &r.name;
                    let target_val = r.target.average_utilization
                        .map(|v| format!("{v}%"))
                        .or_else(|| r.target.average_value.as_ref().map(|av| av.0.clone()))
                        .unwrap_or_default();
                    return Some(format!("{}:{}", &**name, target_val));
                }
                None
            }).collect::<Vec<_>>().join(", ")
        })
        .unwrap_or_default();
    HpaInfo {
        name,
        namespace,
        min,
        max,
        replicas,
        target,
        age: fmt_age(&hpa.metadata.creation_timestamp),
    }
}

pub(crate) async fn list_hpas(context: Option<String>) -> Result<Vec<HpaInfo>, String> {
    let client = make_client(context).await?;
    let hpas = Api::<k8s_openapi::api::autoscaling::v2::HorizontalPodAutoscaler>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list HPAs: {e}"))?;
    Ok(hpas.items.into_iter().map(hpa_to_info).collect())
}
