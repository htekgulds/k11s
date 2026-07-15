use k8s_openapi::api::apps::v1::{Deployment, StatefulSet};
use k8s_openapi::api::core::v1::{
    ConfigMap, Event, Node, PersistentVolumeClaim, Pod, Secret, Service,
};
use k8s_openapi::api::networking::v1::Ingress;
use kube::api::ListParams;
use kube::Api;
use serde::Serialize;

use crate::kube::client::{fmt_age, make_client};

// ── Data structures ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize)]
pub(crate) struct DashboardData {
    pub node_health: NodeHealth,
    pub resource_counts: ResourceCounts,
    pub recent_events: Vec<DashboardEvent>,
    pub cluster_info: ClusterInfo,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct NodeHealth {
    pub total: usize,
    pub ready: usize,
    pub not_ready: usize,
    pub unknown: usize,
    /// Total allocatable CPU (millicores as string, e.g. "4000m" or "4")
    pub total_cpu: String,
    /// Total allocatable memory (raw k8s quantity, e.g. "16Gi")
    pub total_memory: String,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ResourceCounts {
    pub pods: usize,
    pub deployments: usize,
    pub statefulsets: usize,
    pub services: usize,
    pub ingresses: usize,
    pub configmaps: usize,
    pub secrets: usize,
    pub pvcs: usize,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct DashboardEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub reason: String,
    pub message: String,
    pub namespace: String,
    pub name: String,
    pub count: i32,
    pub last_seen: String,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ClusterInfo {
    pub version: String,
    pub platform: String,
    pub name: String,
}

// ── Dashboard data aggregation ──────────────────────────────────────────────

pub(crate) async fn get_cluster_dashboard(
    context: Option<String>,
) -> Result<DashboardData, String> {
    let client = make_client(context.clone()).await?;

    // Run all queries concurrently
    let (
        nodes_res,
        pods_res,
        deps_res,
        sts_res,
        svcs_res,
        ing_res,
        cms_res,
        sec_res,
        pvcs_res,
        events_res,
        version_res,
    ) = tokio::join!(
        list_nodes_raw(&client),
        count_pods(&client),
        count_deployments(&client),
        count_statefulsets(&client),
        count_services(&client),
        count_ingresses(&client),
        count_configmaps(&client),
        count_secrets(&client),
        count_pvcs(&client),
        list_recent_events(&client),
        get_server_version(&client),
    );

    let node_health = nodes_res.unwrap_or_default();
    let resource_counts = ResourceCounts {
        pods: pods_res.unwrap_or(0),
        deployments: deps_res.unwrap_or(0),
        statefulsets: sts_res.unwrap_or(0),
        services: svcs_res.unwrap_or(0),
        ingresses: ing_res.unwrap_or(0),
        configmaps: cms_res.unwrap_or(0),
        secrets: sec_res.unwrap_or(0),
        pvcs: pvcs_res.unwrap_or(0),
    };
    let recent_events = events_res.unwrap_or_default();
    let cluster_info = version_res.unwrap_or_else(|e| ClusterInfo {
        version: e,
        platform: String::new(),
        name: context.unwrap_or_default(),
    });

    Ok(DashboardData {
        node_health,
        resource_counts,
        recent_events,
        cluster_info,
    })
}

// ── Node health ─────────────────────────────────────────────────────────────

async fn list_nodes_raw(client: &kube::Client) -> Result<NodeHealth, String> {
    let nodes = Api::<Node>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list nodes: {e}"))?;

    let total = nodes.items.len();
    let mut ready = 0usize;
    let mut not_ready = 0usize;
    let mut unknown = 0usize;
    let mut total_cpu_millis: u64 = 0;
    let mut total_mem: String = String::new();

    for node in &nodes.items {
        let condition = node
            .status
            .as_ref()
            .and_then(|s| s.conditions.as_ref())
            .and_then(|conds| conds.iter().find(|c| c.type_ == "Ready"));

        match condition.map(|c| c.status.as_str()) {
            Some("True") => ready += 1,
            Some("False") => not_ready += 1,
            _ => unknown += 1,
        }

        // Sum allocatable CPU (parse millicores)
        if let Some(cap) = node.status.as_ref().and_then(|s| s.allocatable.as_ref()) {
            if let Some(cpu_q) = cap.get("cpu") {
                total_cpu_millis += parse_cpu_millis(&cpu_q.0);
            }
            if let Some(mem_q) = cap.get("memory") {
                if total_mem.is_empty() {
                    total_mem = mem_q.0.clone();
                } else {
                    total_mem = sum_memory_quantities(&total_mem, &mem_q.0);
                }
            }
        }
    }

    Ok(NodeHealth {
        total,
        ready,
        not_ready,
        unknown,
        total_cpu: format_cpu(total_cpu_millis),
        total_memory: total_mem,
    })
}

impl Default for NodeHealth {
    fn default() -> Self {
        Self {
            total: 0,
            ready: 0,
            not_ready: 0,
            unknown: 0,
            total_cpu: String::new(),
            total_memory: String::new(),
        }
    }
}

/// Parse a k8s CPU quantity to millicores.
/// "2" → 2000, "500m" → 500, "100m" → 100, "1.5" → 1500
fn parse_cpu_millis(q: &str) -> u64 {
    let q = q.trim();
    if let Some(milli) = q.strip_suffix('m') {
        milli.parse::<u64>().unwrap_or(0)
    } else if let Some(decimal) = q.find('.') {
        // e.g. "1.5" → 1500m
        let whole: u64 = q[..decimal].parse().unwrap_or(0);
        let frac: &str = &q[decimal + 1..];
        let frac_padded = format!("{:<3}", frac); // pad to 3 digits
        let frac_val: u64 = frac_padded[..3].parse().unwrap_or(0);
        whole * 1000 + frac_val
    } else {
        q.parse::<u64>().unwrap_or(0) * 1000
    }
}

/// Format millicores to human-readable string
fn format_cpu(millis: u64) -> String {
    if millis >= 1000 {
        let cores = millis as f64 / 1000.0;
        if cores.fract() < 0.01 {
            format!("{}", cores as u64)
        } else {
            format!("{:.1}", cores)
        }
    } else {
        format!("{millis}m")
    }
}

/// Simple memory sum: parse Gi/Mi/Ki values, add, return as Gi.
/// This is a best-effort parser; returns first + second if parsing fails.
fn sum_memory_quantities(a: &str, b: &str) -> String {
    let a_bytes = parse_memory_bytes(a);
    let b_bytes = parse_memory_bytes(b);
    let total = a_bytes + b_bytes;
    format_memory(total)
}

fn parse_memory_bytes(q: &str) -> u64 {
    let q = q.trim();
    if let Some(val) = q.strip_suffix("Ki") {
        val.parse::<u64>().unwrap_or(0) * 1024
    } else if let Some(val) = q.strip_suffix("Mi") {
        val.parse::<u64>().unwrap_or(0) * 1024 * 1024
    } else if let Some(val) = q.strip_suffix("Gi") {
        val.parse::<u64>().unwrap_or(0) * 1024 * 1024 * 1024
    } else if let Some(val) = q.strip_suffix("Ti") {
        val.parse::<u64>().unwrap_or(0) * 1024 * 1024 * 1024 * 1024
    } else if let Some(val) = q.strip_suffix('E') {
        // Exabyte — rare; just parse as-is
        val.parse::<u64>().unwrap_or(0) * 1024 * 1024 * 1024 * 1024 * 1024 * 1024
    } else if let Some(val) = q.strip_suffix('e') {
        val.parse::<u64>().unwrap_or(0) * 1024 * 1024 * 1024 * 1024 * 1024 * 1024
    } else {
        // Plain bytes
        q.parse::<u64>().unwrap_or(0)
    }
}

fn format_memory(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    const TB: u64 = GB * 1024;

    if bytes >= TB {
        let val = bytes as f64 / TB as f64;
        format!("{:.1}Ti", val)
    } else if bytes >= GB {
        let val = bytes as f64 / GB as f64;
        format!("{:.1}Gi", val)
    } else if bytes >= MB {
        format!("{}Mi", bytes / MB)
    } else if bytes >= KB {
        format!("{}Ki", bytes / KB)
    } else {
        format!("{bytes}")
    }
}

// ── Resource counts ─────────────────────────────────────────────────────────

async fn count_pods(client: &kube::Client) -> Result<usize, String> {
    Api::<Pod>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map(|r| r.items.len())
        .map_err(|e| format!("Failed to list pods: {e}"))
}

async fn count_deployments(client: &kube::Client) -> Result<usize, String> {
    Api::<Deployment>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map(|r| r.items.len())
        .map_err(|e| format!("Failed to list deployments: {e}"))
}

async fn count_statefulsets(client: &kube::Client) -> Result<usize, String> {
    Api::<StatefulSet>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map(|r| r.items.len())
        .map_err(|e| format!("Failed to list statefulsets: {e}"))
}

async fn count_services(client: &kube::Client) -> Result<usize, String> {
    Api::<Service>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map(|r| r.items.len())
        .map_err(|e| format!("Failed to list services: {e}"))
}

async fn count_ingresses(client: &kube::Client) -> Result<usize, String> {
    Api::<Ingress>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map(|r| r.items.len())
        .map_err(|e| format!("Failed to list ingresses: {e}"))
}

async fn count_configmaps(client: &kube::Client) -> Result<usize, String> {
    Api::<ConfigMap>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map(|r| r.items.len())
        .map_err(|e| format!("Failed to list configmaps: {e}"))
}

async fn count_secrets(client: &kube::Client) -> Result<usize, String> {
    Api::<Secret>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map(|r| r.items.len())
        .map_err(|e| format!("Failed to list secrets: {e}"))
}

async fn count_pvcs(client: &kube::Client) -> Result<usize, String> {
    Api::<PersistentVolumeClaim>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map(|r| r.items.len())
        .map_err(|e| format!("Failed to list PVCs: {e}"))
}

// ── Recent events ───────────────────────────────────────────────────────────

async fn list_recent_events(client: &kube::Client) -> Result<Vec<DashboardEvent>, String> {
    let lp = ListParams::default().limit(50);
    let mut events = Api::<Event>::all(client.clone())
        .list(&lp)
        .await
        .map_err(|e| format!("Failed to list events: {e}"))?;

    // Sort by lastTimestamp descending (most recent first)
    events.items.sort_by(|a, b| {
        let a_ts = a.last_timestamp.as_ref().or(a.metadata.creation_timestamp.as_ref());
        let b_ts = b.last_timestamp.as_ref().or(b.metadata.creation_timestamp.as_ref());
        b_ts.cmp(&a_ts)
    });

    // Take top 15
    let items: Vec<_> = events.items.into_iter().take(15).collect();

    let mut result: Vec<DashboardEvent> = items
        .into_iter()
        .map(|ev| {
            let involved = ev.involved_object;
            DashboardEvent {
                event_type: ev.type_.clone().unwrap_or_else(|| "Normal".to_string()),
                reason: ev.reason.clone().unwrap_or_default(),
                message: truncate(ev.message.unwrap_or_default(), 120),
                namespace: involved.namespace.unwrap_or_default(),
                name: involved.name.unwrap_or_default(),
                count: ev.count.unwrap_or(0),
                last_seen: fmt_age(&ev.last_timestamp.or(ev.metadata.creation_timestamp)),
            }
        })
        .collect();

    // Sort: Warnings first, then by last_seen
    result.sort_by(|a, b| {
        let a_is_warn = if a.event_type == "Warning" { 0 } else { 1 };
        let b_is_warn = if b.event_type == "Warning" { 0 } else { 1 };
        a_is_warn.cmp(&b_is_warn)
    });

    Ok(result)
}

fn truncate(s: String, max: usize) -> String {
    if s.len() > max {
        format!("{}…", &s[..max])
    } else {
        s
    }
}

// ── Server version ──────────────────────────────────────────────────────────

async fn get_server_version(client: &kube::Client) -> Result<ClusterInfo, String> {
    let version = client
        .apiserver_version()
        .await
        .map_err(|e| format!("Failed to get server version: {e}"))?;

    let ver_str = format!("v{}.{}.{}", version.major, version.minor, version.git_version);
    let platform = detect_platform(&ver_str);

    Ok(ClusterInfo {
        version: ver_str,
        platform,
        name: String::new(),
    })
}

/// Best-effort platform detection from server version string
fn detect_platform(version: &str) -> String {
    let lower = version.to_lowercase();
    if lower.contains("eks") {
        "EKS".to_string()
    } else if lower.contains("gke") {
        "GKE".to_string()
    } else if lower.contains("aks") {
        "AKS".to_string()
    } else if lower.contains("kind") {
        "Kind".to_string()
    } else if lower.contains("k3s") {
        "K3s".to_string()
    } else if lower.contains("microk8s") {
        "MicroK8s".to_string()
    } else if lower.contains("minikube") {
        "Minikube".to_string()
    } else if lower.contains("openshift") || lower.contains("okd") {
        "OpenShift".to_string()
    } else {
        "Kubernetes".to_string()
    }
}
