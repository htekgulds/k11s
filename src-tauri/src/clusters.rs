use kube::config::Kubeconfig;
use serde::Serialize;

const COLORS: &[&str] = &["#ff4d4d", "#fb923c", "#f5c518", "#39ff8a", "#7dd3fc", "#c4b5fd"];

#[derive(Debug, Clone, Serialize)]
pub struct ClusterInfo {
    pub id: String,
    pub label: String,
    pub env: String,
    pub provider: String,
    pub region: String,
    pub context: String,
    pub color: String,
}

fn infer_env(name: &str) -> &'static str {
    let lower = name.to_lowercase();
    if lower.contains("prod") {
        "prod"
    } else if lower.contains("stag") {
        "staging"
    } else {
        "dev"
    }
}

fn infer_provider(context: &str) -> &'static str {
    if context.starts_with("arn:aws:eks:") {
        "eks"
    } else if context.starts_with("gke_") {
        "gke"
    } else if context.starts_with("kind-") || context.contains("kind") {
        "kind"
    } else if context.contains("aks") {
        "aks"
    } else {
        "k8s"
    }
}

fn infer_region(context: &str, provider: &str) -> String {
    match provider {
        "eks" => context
            .split(':')
            .nth(3)
            .unwrap_or("unknown")
            .to_string(),
        "gke" => context
            .split('_')
            .nth(2)
            .unwrap_or("unknown")
            .to_string(),
        "kind" => "local".to_string(),
        _ => "—".to_string(),
    }
}

fn env_color(env: &str) -> &'static str {
    match env {
        "prod" => "#ff4d4d",
        "staging" => "#f5c518",
        _ => "#39ff8a",
    }
}

pub fn list_clusters() -> Result<Vec<ClusterInfo>, String> {
    let kc = Kubeconfig::read()
        .map_err(|e| format!("Failed to read kubeconfig: {e}"))?;

    let current = kc.current_context.clone().unwrap_or_default();

    let clusters: Vec<ClusterInfo> = kc
        .contexts
        .iter()
        .enumerate()
        .map(|(i, ctx)| {
            let name = ctx.name.clone();
            let context = ctx
                .context
                .as_ref()
                .map(|c| c.cluster.clone())
                .unwrap_or_else(|| name.clone());
            let env = infer_env(&name).to_string();
            let provider = infer_provider(&context).to_string();
            let region = infer_region(&context, &provider);
            let color = if name == current {
                env_color(&env).to_string()
            } else {
                COLORS[i % COLORS.len()].to_string()
            };
            ClusterInfo {
                label: name.clone(),
                id: name,
                env,
                provider,
                region,
                context,
                color,
            }
        })
        .collect();

    if clusters.is_empty() {
        return Err("No kubeconfig contexts found".to_string());
    }

    Ok(clusters)
}
