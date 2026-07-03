use kube::config::Kubeconfig;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AppConfig {
    #[serde(default)]
    kubeconfigs: Vec<String>,
}

fn config_path() -> Option<PathBuf> {
    if let Ok(path) = std::env::var("K11S_CONFIG") {
        return Some(PathBuf::from(path));
    }
    let home = std::env::var("HOME").ok()?;
    Some(PathBuf::from(home).join(".config").join("k11s").join("config.json"))
}

fn read_app_config() -> AppConfig {
    let path = match config_path() {
        Some(p) => p,
        None => return AppConfig { kubeconfigs: vec![] },
    };
    let content = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return AppConfig { kubeconfigs: vec![] },
    };
    serde_json::from_str(&content).unwrap_or(AppConfig { kubeconfigs: vec![] })
}

pub(crate) fn load_merged_kubeconfig() -> Result<Kubeconfig, String> {
    let mut config = Kubeconfig::read()
        .map_err(|e| format!("Failed to read kubeconfig: {e}"))?;

    let app_config = read_app_config();
    for path in &app_config.kubeconfigs {
        if let Ok(other) = Kubeconfig::read_from(path) {
            config = config
                .merge(other)
                .map_err(|e| format!("Failed to merge kubeconfig {path}: {e}"))?;
        }
    }

    Ok(config)
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

pub fn add_kubeconfig_path(path: &str) -> Result<Vec<ClusterInfo>, String> {
    let mut app_config = read_app_config();

    if app_config.kubeconfigs.iter().any(|p| p == path) {
        return list_clusters();
    }

    app_config.kubeconfigs.push(path.to_string());

    let config_path = config_path().ok_or("Cannot determine config path")?;
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {e}"))?;
    }
    let json = serde_json::to_string_pretty(&app_config).map_err(|e| e.to_string())?;
    std::fs::write(&config_path, json).map_err(|e| format!("Failed to write config: {e}"))?;

    list_clusters()
}

pub fn list_clusters() -> Result<Vec<ClusterInfo>, String> {
    let kc = load_merged_kubeconfig()?;

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
            let color = COLORS[i % COLORS.len()].to_string();
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
