use kube::config::KubeConfigOptions;
use kube::{Client, Config};

use crate::clusters;

pub(crate) async fn make_client(context: Option<String>) -> Result<Client, String> {
    let kc = clusters::load_merged_kubeconfig()?;
    let opts = KubeConfigOptions {
        context: context.clone(),
        ..Default::default()
    };
    let config = Config::from_custom_kubeconfig(kc, &opts)
        .await
        .map_err(|e| format!("Failed to load kubeconfig: {e}"))?;
    Client::try_from(config).map_err(|e| format!("Failed to create client: {e}"))
}

/// Validate a Kubernetes resource name conforms to DNS-1123 label pattern.
/// Accepts lowercase alphanumeric, hyphens, dots; max 253 chars.
#[allow(dead_code)]
pub(crate) fn validate_dns_name(name: &str, label: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err(format!("{label} must not be empty"));
    }
    if name.len() > 253 {
        return Err(format!("{label} too long (max 253 chars): got {}", name.len()));
    }
    if !name
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '.')
    {
        return Err(format!(
            "{label} must be lowercase alphanumeric, hyphens, or dots: got \"{name}\""
        ));
    }
    if name.starts_with('-') || name.ends_with('-') || name.starts_with('.') || name.ends_with('.') {
        return Err(format!(
            "{label} must not start or end with hyphen or dot: got \"{name}\""
        ));
    }
    Ok(())
}

pub(crate) fn fmt_age(ts: &Option<k8s_openapi::apimachinery::pkg::apis::meta::v1::Time>) -> String {
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
        .unwrap_or_else(|| "\u{2014}".to_string())
}
