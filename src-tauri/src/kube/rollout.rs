use k8s_openapi::api::apps::v1::{ControllerRevision, Deployment, StatefulSet};
use kube::api::{ListParams, Patch, PatchParams};
use kube::Api;
use serde::Serialize;
use serde_json::json;

use crate::kube::client::make_client;

#[derive(Debug, Serialize)]
pub(crate) struct RolloutResponse {
    pub success: bool,
    pub message: String,
}

/// Run a rollout operation using the kube-rs client.
/// action: "restart", "undo", "history"
pub(crate) async fn rollout_action(
    context: Option<String>,
    kind: String,
    name: String,
    namespace: String,
    action: String,
) -> Result<RolloutResponse, String> {
    let client = make_client(context).await?;

    match action.as_str() {
        "restart" => rollout_restart(&client, &kind, &name, &namespace).await,
        "history" => rollout_history(&client, &kind, &name, &namespace).await,
        "undo" => rollout_undo(&client, &kind, &name, &namespace).await,
        _ => Err(format!("Unknown rollout action: {action}. Use restart, history, or undo")),
    }
}

async fn rollout_restart(
    client: &kube::Client,
    kind: &str,
    name: &str,
    namespace: &str,
) -> Result<RolloutResponse, String> {
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    let patch = json!({
        "spec": {
            "template": {
                "metadata": {
                    "annotations": {
                        "kubectl.kubernetes.io/restartedAt": now
                    }
                }
            }
        }
    });
    let params = PatchParams::default();

    match kind {
        "deployment" => {
            let api: Api<Deployment> = Api::namespaced(client.clone(), namespace);
            api.patch(name, &params, &Patch::Merge(&patch))
                .await
                .map_err(|e| format!("rollout restart failed: {e}"))?;
        }
        "statefulset" => {
            let api: Api<StatefulSet> = Api::namespaced(client.clone(), namespace);
            api.patch(name, &params, &Patch::Merge(&patch))
                .await
                .map_err(|e| format!("rollout restart failed: {e}"))?;
        }
        _ => return Err(format!("Unsupported kind for rollout: {kind}")),
    }

    Ok(RolloutResponse {
        success: true,
        message: format!("{kind}/{name} restarted"),
    })
}

async fn rollout_history(
    client: &kube::Client,
    kind: &str,
    name: &str,
    namespace: &str,
) -> Result<RolloutResponse, String> {
    let api: Api<ControllerRevision> = Api::namespaced(client.clone(), namespace);
    let list = api
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list revisions: {e}"))?;

    let mut revisions: Vec<&ControllerRevision> = list
        .items
        .iter()
        .filter(|rev| {
            rev.metadata
                .owner_references
                .as_ref()
                .map_or(false, |refs| refs.iter().any(|r| r.name == name))
        })
        .collect();

    revisions.sort_by_key(|r| r.revision);

    if revisions.is_empty() {
        return Ok(RolloutResponse {
            success: true,
            message: format!("No rollout history found for {kind}/{name}"),
        });
    }

    let mut output = format!("{:<9} {}\n", "REVISION", "CHANGE-CAUSE");
    for rev in &revisions {
        let change_cause = rev
            .metadata
            .annotations
            .as_ref()
            .and_then(|a| a.get("kubernetes.io/change-cause").cloned())
            .unwrap_or_default();
        output.push_str(&format!("{:<9} {}\n", rev.revision, change_cause));
    }

    Ok(RolloutResponse {
        success: true,
        message: output,
    })
}

async fn rollout_undo(
    client: &kube::Client,
    kind: &str,
    name: &str,
    namespace: &str,
) -> Result<RolloutResponse, String> {
    let rev_api: Api<ControllerRevision> = Api::namespaced(client.clone(), namespace);
    let list = rev_api
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list revisions: {e}"))?;

    let mut revisions: Vec<&ControllerRevision> = list
        .items
        .iter()
        .filter(|rev| {
            rev.metadata
                .owner_references
                .as_ref()
                .map_or(false, |refs| refs.iter().any(|r| r.name == name))
        })
        .collect();

    revisions.sort_by_key(|r| r.revision);

    if revisions.len() < 2 {
        return Err("No previous revision to roll back to".to_string());
    }

    // Previous revision is second-to-last
    let target = revisions[revisions.len() - 2];
    let target_rev = target.revision;

    let data = target
        .data
        .as_ref()
        .map(|d| d.0.clone())
        .ok_or_else(|| "Revision data is empty".to_string())?;

    // Extract spec.template from the historical revision's full resource data
    let template = data
        .get("spec")
        .and_then(|s| s.get("template"))
        .ok_or_else(|| "Could not find spec.template in revision data".to_string())?;

    let patch = json!({
        "spec": {
            "template": template
        }
    });
    let params = PatchParams::default();

    match kind {
        "deployment" => {
            let api: Api<Deployment> = Api::namespaced(client.clone(), namespace);
            api.patch(name, &params, &Patch::Merge(&patch))
                .await
                .map_err(|e| format!("rollout undo failed: {e}"))?;
        }
        "statefulset" => {
            let api: Api<StatefulSet> = Api::namespaced(client.clone(), namespace);
            api.patch(name, &params, &Patch::Merge(&patch))
                .await
                .map_err(|e| format!("rollout undo failed: {e}"))?;
        }
        _ => return Err(format!("Unsupported kind for rollout: {kind}")),
    }

    Ok(RolloutResponse {
        success: true,
        message: format!("Rolled back {kind}/{name} to revision {target_rev}"),
    })
}
