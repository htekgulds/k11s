use k8s_openapi::api::core::v1::{PersistentVolume, PersistentVolumeClaim};
use kube::api::ListParams;
use kube::Api;
use serde::Serialize;

use crate::kube::client::{fmt_age, make_client};

#[derive(Debug, Clone, Serialize)]
pub(crate) struct PvUsageInfo {
    pub pv_name: String,
    pub capacity: String,
    pub used_by: String,
    pub status: String,
    pub storage_class: String,
    pub access_modes: String,
    pub pvc_namespace: String,
    pub pvc_name: String,
    pub usage_percent: String,
    pub age: String,
}

/// Parse a human-readable capacity string (e.g. "1Gi", "500Mi") into bytes.
/// Returns 0 if parsing fails.
fn parse_capacity_bytes(cap: &str) -> u64 {
    let cap = cap.trim();
    if cap.is_empty() || cap == "\u{2014}" {
        return 0;
    }
    // Extract numeric part and suffix
    let num_end = cap.find(|c: char| !c.is_ascii_digit() && c != '.').unwrap_or(cap.len());
    let num_str = &cap[..num_end];
    let suffix = cap[num_end..].to_uppercase();
    let value: f64 = num_str.parse().unwrap_or(0.0);
    (match suffix.as_str() {
        "K" | "KI" => value * 1000.0,
        "M" | "MI" => value * 1000.0 * 1000.0,
        "G" | "GI" => value * 1000.0 * 1000.0 * 1000.0,
        "T" | "TI" => value * 1000.0 * 1000.0 * 1000.0 * 1000.0,
        "P" | "PI" => value * 1000.0 * 1000.0 * 1000.0 * 1000.0 * 1000.0,
        "E" | "EI" => value * 1000.0 * 1000.0 * 1000.0 * 1000.0 * 1000.0 * 1000.0,
        "KIB" => value * 1024.0,
        "MIB" => value * 1024.0 * 1024.0,
        "GIB" => value * 1024.0 * 1024.0 * 1024.0,
        "TIB" => value * 1024.0 * 1024.0 * 1024.0 * 1024.0,
        "PIB" => value * 1024.0 * 1024.0 * 1024.0 * 1024.0 * 1024.0,
        "EIB" => value * 1024.0 * 1024.0 * 1024.0 * 1024.0 * 1024.0 * 1024.0,
        _ => value, // Assume raw bytes already
    }) as u64
}

pub(crate) async fn list_pv_usage(context: Option<String>) -> Result<Vec<PvUsageInfo>, String> {
    let client = make_client(context).await?;

    // List all PersistentVolumes
    let pvs = Api::<PersistentVolume>::all(client.clone())
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list PVs: {e}"))?;

    // List all PersistentVolumeClaims
    let pvcs = Api::<PersistentVolumeClaim>::all(client)
        .list(&ListParams::default())
        .await
        .map_err(|e| format!("Failed to list PVCs: {e}"))?;

    // Build a map: volume_name -> Vec of PVCs bound to that volume
    let mut pvc_by_volume: std::collections::HashMap<String, Vec<&PersistentVolumeClaim>> =
        std::collections::HashMap::new();
    for pvc in &pvcs.items {
        if let Some(spec) = &pvc.spec {
            if let Some(vol_name) = &spec.volume_name {
                pvc_by_volume
                    .entry(vol_name.clone())
                    .or_default()
                    .push(pvc);
            }
        }
    }

    let mut usage_info: Vec<PvUsageInfo> = Vec::new();

    for pv in &pvs.items {
        let pv_name = pv.metadata.name.as_deref().unwrap_or("?").to_string();
        let capacity = pv
            .spec
            .as_ref()
            .and_then(|s| s.capacity.as_ref())
            .and_then(|c| c.get("storage").map(|q| q.0.clone()))
            .unwrap_or_else(|| "\u{2014}".to_string());
        let access_modes = pv
            .spec
            .as_ref()
            .and_then(|s| s.access_modes.as_ref())
            .map(|modes| modes.join(","))
            .unwrap_or_default();
        let status = pv
            .status
            .as_ref()
            .and_then(|s| s.phase.clone())
            .unwrap_or_else(|| "Unknown".to_string());
        let storage_class = pv
            .spec
            .as_ref()
            .and_then(|s| s.storage_class_name.clone())
            .unwrap_or_else(|| "\u{2014}".to_string());

        // Find matching PVCs
        let bound_pvcs = pvc_by_volume.get(&pv_name);

        if let Some(pvc_list) = bound_pvcs {
            for pvc in pvc_list {
                let pvc_ns = pvc.metadata.namespace.as_deref().unwrap_or("?").to_string();
                let pvc_nm = pvc.metadata.name.as_deref().unwrap_or("?").to_string();
                let used_by = format!("{pvc_ns}/{pvc_nm}");

                // Get PVC requested capacity (spec.resources.requests.storage)
                let pvc_request = pvc
                    .spec
                    .as_ref()
                    .and_then(|s| s.resources.as_ref())
                    .and_then(|r| r.requests.as_ref())
                    .and_then(|req| req.get("storage"))
                    .map(|q| q.0.clone())
                    .unwrap_or_default();

                let usage_percent = if !pvc_request.is_empty()
                    && !capacity.is_empty()
                    && capacity != "\u{2014}"
                {
                    let cap_bytes = parse_capacity_bytes(&capacity);
                    let req_bytes = parse_capacity_bytes(&pvc_request);
                    if cap_bytes > 0 {
                        let pct = (req_bytes as f64 / cap_bytes as f64) * 100.0;
                        format!("{:.1}%", pct)
                    } else {
                        "\u{2014}".to_string()
                    }
                } else {
                    "\u{2014}".to_string()
                };

                usage_info.push(PvUsageInfo {
                    pv_name: pv_name.clone(),
                    capacity: capacity.clone(),
                    used_by: used_by.clone(),
                    status: status.clone(),
                    storage_class: storage_class.clone(),
                    access_modes: access_modes.clone(),
                    pvc_namespace: pvc_ns,
                    pvc_name: pvc_nm,
                    usage_percent,
                    age: fmt_age(&pv.metadata.creation_timestamp),
                });
            }
        } else {
            // PV with no bound PVCs — show it as unbound
            usage_info.push(PvUsageInfo {
                pv_name: pv_name.clone(),
                capacity: capacity.clone(),
                used_by: "\u{2014}".to_string(),
                status: status.clone(),
                storage_class: storage_class.clone(),
                access_modes: access_modes.clone(),
                pvc_namespace: String::new(),
                pvc_name: String::new(),
                usage_percent: "\u{2014}".to_string(),
                age: fmt_age(&pv.metadata.creation_timestamp),
            });
        }
    }

    Ok(usage_info)
}
