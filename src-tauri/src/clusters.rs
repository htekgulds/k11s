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

fn write_app_config(config: &AppConfig) -> Result<(), String> {
    let config_path = config_path().ok_or("Cannot determine config path")?;
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {e}"))?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(&config_path, json).map_err(|e| format!("Failed to write config: {e}"))?;
    Ok(())
}

fn context_names_from(path: &str) -> Result<Vec<String>, String> {
    let kc = Kubeconfig::read_from(path)
        .map_err(|e| format!("Failed to read {path}: {e}"))?;
    Ok(kc.contexts.iter().map(|c| c.name.clone()).collect())
}

fn existing_context_names() -> Vec<String> {
    load_merged_kubeconfig()
        .map(|kc| kc.contexts.iter().map(|c| c.name.clone()).collect())
        .unwrap_or_default()
}

pub(crate) fn load_merged_kubeconfig() -> Result<Kubeconfig, String> {
    let mut config = Kubeconfig::read().unwrap_or_default();

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

fn add_validated_path(app_config: &mut AppConfig, path: &str) -> Result<(), String> {
    if app_config.kubeconfigs.iter().any(|p| p == path) {
        return Ok(());
    }

    let new_contexts = context_names_from(path);
    if let Ok(names) = new_contexts {
        let existing = existing_context_names();
        if let Some(dup) = names.iter().find(|n| existing.contains(n)) {
            eprintln!("Skipping {path}: context '{dup}' already exists");
            return Ok(());
        }
    }

    app_config.kubeconfigs.push(path.to_string());
    Ok(())
}

pub fn add_kubeconfig_paths(paths: &[String]) -> Result<Vec<ClusterInfo>, String> {
    let mut app_config = read_app_config();
    for path in paths {
        if let Err(e) = add_validated_path(&mut app_config, path) {
            eprintln!("Skipping {path}: {e}");
        }
    }
    write_app_config(&app_config)?;
    list_clusters()
}

pub fn add_kubeconfig_folder(folder: &str) -> Result<Vec<ClusterInfo>, String> {
    let dir = std::path::Path::new(folder);
    if !dir.is_dir() {
        return Err(format!("Not a directory: {folder}"));
    }

    let mut app_config = read_app_config();

    let mut entries: Vec<_> = std::fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory {folder}: {e}"))?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file())
        .collect();
    entries.sort_by_key(|e| e.file_name());

    for entry in &entries {
        let path_str = entry.path().to_string_lossy().to_string();
        if let Err(e) = add_validated_path(&mut app_config, &path_str) {
            eprintln!("Skipping {path_str}: {e}");
        }
    }

    write_app_config(&app_config)?;
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

    Ok(clusters)
}
