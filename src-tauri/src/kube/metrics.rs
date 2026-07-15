use crate::kube::client::make_client;
use kube::client::Body;
use serde::Deserialize;
use std::collections::BTreeMap;

/// Container-level metrics returned to the frontend
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub(crate) struct ContainerMetrics {
    pub name: String,
    /// CPU usage in millicores
    pub cpu: f64,
    /// Memory usage in MiB
    pub memory: f64,
    /// CPU request in millicores (0 if unknown)
    pub cpu_request: f64,
    /// CPU limit in millicores (0 if unknown)
    pub cpu_limit: f64,
    /// Memory request in MiB (0 if unknown)
    pub memory_request: f64,
    /// Memory limit in MiB (0 if unknown)
    pub memory_limit: f64,
    pub timestamp: String,
}

// ── Metrics API response structs ──────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct PodMetrics {
    metadata: MetricsMeta,
    timestamp: String,
    containers: Vec<ContainerMetricsRaw>,
}

#[derive(Debug, Deserialize)]
struct MetricsMeta {
    name: String,
    namespace: String,
}

#[derive(Debug, Deserialize)]
struct ContainerMetricsRaw {
    name: String,
    usage: BTreeMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct MetricsServerError {
    message: Option<String>,
}

// ── Quantity parsing helpers ──────────────────────────────────────────────

/// Parse a Kubernetes resource quantity into millicores (for CPU)
fn parse_cpu_millicores(s: &str) -> f64 {
    let s = s.trim();
    if let Some(_suffix) = s.strip_suffix('n') {
        // nanocores -> millicores
        s.parse::<f64>().unwrap_or(0.0) / 1_000_000.0
    } else if let Some(suffix) = s.strip_suffix('u') {
        // microcores -> millicores
        suffix.parse::<f64>().unwrap_or(0.0) / 1_000.0
    } else if let Some(suffix) = s.strip_suffix('m') {
        // millicores
        suffix.parse::<f64>().unwrap_or(0.0)
    } else if let Some(suffix) = s.strip_suffix('k') {
        // kilo CPU (1000 cores) — rare
        suffix.parse::<f64>().unwrap_or(0.0) * 1_000_000.0
    } else {
        // whole cores
        s.parse::<f64>().unwrap_or(0.0) * 1000.0
    }
}

/// Parse a Kubernetes resource quantity into MiB (for memory)
fn parse_memory_mib(s: &str) -> f64 {
    let s = s.trim();
    if let Some(suffix) = s.strip_suffix("Ki") {
        suffix.parse::<f64>().unwrap_or(0.0) / 1024.0
    } else if let Some(suffix) = s.strip_suffix("Mi") {
        suffix.parse::<f64>().unwrap_or(0.0)
    } else if let Some(suffix) = s.strip_suffix("Gi") {
        suffix.parse::<f64>().unwrap_or(0.0) * 1024.0
    } else if let Some(suffix) = s.strip_suffix("Ti") {
        suffix.parse::<f64>().unwrap_or(0.0) * 1_048_576.0
    } else if let Some(suffix) = s.strip_suffix('K') {
        suffix.parse::<f64>().unwrap_or(0.0) / 1000.0
    } else if let Some(suffix) = s.strip_suffix('M') {
        suffix.parse::<f64>().unwrap_or(0.0)
    } else if let Some(suffix) = s.strip_suffix('G') {
        suffix.parse::<f64>().unwrap_or(0.0) * 1000.0
    } else if let Some(suffix) = s.strip_suffix('T') {
        suffix.parse::<f64>().unwrap_or(0.0) * 1_000_000.0
    } else if let Some(suffix) = s.strip_suffix('m') {
        // millibytes — unlikely but handle it
        suffix.parse::<f64>().unwrap_or(0.0) / 1000.0
    } else if let Some(suffix) = s.strip_suffix('k') {
        suffix.parse::<f64>().unwrap_or(0.0) / 1000.0
    } else {
        // plain bytes
        s.parse::<f64>().unwrap_or(0.0) / (1024.0 * 1024.0)
    }
}

/// Parse a resource request/limit value from the container spec (Quantity string)
fn parse_resource_value(s: &str) -> f64 {
    let s = s.trim();
    if s.is_empty() { return 0.0; }

    if s.bytes().any(|b| b == b'm' || b == b'n' || b == b'u') {
        // CPU-like: ends with m, n, u, or decimal with m-scale
        if s.contains('.') || s.ends_with('m') || s.ends_with('n') || s.ends_with('u') {
            return parse_cpu_millicores(s);
        }
    }
    if s.bytes().any(|b| b == b'i' || b == b'K' || b == b'M' || b == b'G' || b == b'T') {
        // Memory-like: binary or decimal suffixes
        return parse_memory_mib(s);
    }
    // heuristic: large numbers (>100) are likely plain bytes (memory), small are cores (CPU)
    if let Ok(v) = s.parse::<f64>() {
        if v > 100.0 {
            v / (1024.0 * 1024.0) // bytes -> MiB
        } else {
            v * 1000.0 // cores -> millicores
        }
    } else {
        0.0
    }
}

// ── Main metrics function ─────────────────────────────────────────────────

/// Fetch pod resource usage metrics from the metrics-server API.
/// Returns per-container CPU (millicores) and memory (MiB) values,
/// plus resource requests/limits from the Pod spec.
pub(crate) async fn get_pod_metrics(
    context: Option<String>,
    namespace: String,
    pod: String,
) -> Result<Vec<ContainerMetrics>, String> {
    let client = make_client(context).await?;

    // Fetch pod spec for request/limit values
    let pod_info = get_pod_resource_spec(&client, &namespace, &pod).await;

    // Build request to metrics.k8s.io API
    let url = format!(
        "/apis/metrics.k8s.io/v1beta1/namespaces/{namespace}/pods/{pod}"
    );

    let request = http::Request::get(&url)
        .body(Body::empty())
        .map_err(|e| format!("Failed to build request: {e}"))?;

    let response = client.send(request).await.map_err(|e| {
        if e.to_string().contains("404") || e.to_string().contains("Not Found") {
            "metrics-server not found. Install it via:\nkubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml".to_string()
        } else {
            format!("Failed to fetch metrics: {e}")
        }
    })?;

    let status = response.status();

    if !status.is_success() {
        let body_bytes = response
            .into_body()
            .collect_bytes()
            .await
            .map_err(|e| format!("Failed to read response: {e}"))?;

        let body_str = String::from_utf8_lossy(&body_bytes);

        if status == http::StatusCode::NOT_FOUND {
            return Err("metrics-server not found. Install it via:\nkubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml".to_string());
        }

        // Try to extract message from error body
        if let Ok(err) = serde_json::from_str::<MetricsServerError>(&body_str) {
            if let Some(msg) = err.message {
                if msg.contains("the server could not find the requested resource") {
                    return Err("metrics-server not found".to_string());
                }
                return Err(format!("Metrics API error: {msg}"));
            }
        }

        return Err(format!(
            "Metrics API returned {}: {}",
            status,
            body_str.chars().take(200).collect::<String>()
        ));
    }

    let body_bytes = response
        .into_body()
        .collect_bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {e}"))?;

    let pod_metrics: PodMetrics = serde_json::from_slice(&body_bytes)
        .map_err(|e| format!("Failed to parse metrics response: {e}"))?;

    // Build results for each container
    let mut results = Vec::new();
    for c in &pod_metrics.containers {
        let cpu_str = c.usage.get("cpu").map(|s| s.as_str()).unwrap_or("0");
        let mem_str = c.usage.get("memory").map(|s| s.as_str()).unwrap_or("0");

        let cpu = parse_cpu_millicores(cpu_str);
        let memory = parse_memory_mib(mem_str);

        // Look up request/limit from pod info
        let (cpu_request, cpu_limit, memory_request, memory_limit) = pod_info
            .get(&c.name)
            .copied()
            .unwrap_or((0.0, 0.0, 0.0, 0.0));

        results.push(ContainerMetrics {
            name: c.name.clone(),
            cpu,
            memory,
            cpu_request,
            cpu_limit,
            memory_request,
            memory_limit,
            timestamp: pod_metrics.timestamp.clone(),
        });
    }

    Ok(results)
}

// ── Pod resource requests/limits ──────────────────────────────────────────

use k8s_openapi::api::core::v1::Pod;

/// Fetch the Pod spec and extract container resource requests/limits.
async fn get_pod_resource_spec(
    client: &kube::Client,
    namespace: &str,
    pod_name: &str,
) -> BTreeMap<String, (f64, f64, f64, f64)> {
    let api: kube::Api::<Pod> = kube::Api::namespaced(client.clone(), namespace);
    let pod = match api.get(pod_name).await {
        Ok(p) => p,
        Err(_) => return BTreeMap::new(),
    };

    let mut result = BTreeMap::new();
    if let Some(spec) = pod.spec {
        for container in spec.containers {
            let name = container.name;
            let (cpu_req, cpu_lim, mem_req, mem_lim) = if let Some(resources) = container.resources {
                let cr = resources
                    .requests
                    .as_ref()
                    .and_then(|r| r.get("cpu"))
                    .map(|v| parse_resource_value(v.0.as_str()))
                    .unwrap_or(0.0);
                let cl = resources
                    .limits
                    .as_ref()
                    .and_then(|r| r.get("cpu"))
                    .map(|v| parse_resource_value(v.0.as_str()))
                    .unwrap_or(0.0);
                let mr = resources
                    .requests
                    .as_ref()
                    .and_then(|r| r.get("memory"))
                    .map(|v| parse_resource_value(v.0.as_str()))
                    .unwrap_or(0.0);
                let ml = resources
                    .limits
                    .as_ref()
                    .and_then(|r| r.get("memory"))
                    .map(|v| parse_resource_value(v.0.as_str()))
                    .unwrap_or(0.0);
                (cr, cl, mr, ml)
            } else {
                (0.0, 0.0, 0.0, 0.0)
            };
            result.insert(name, (cpu_req, cpu_lim, mem_req, mem_lim));
        }
    }

    result
}
