use k8s_openapi::api::core::v1::Event;
use kube::api::ListParams;
use kube::Api;
use serde::Serialize;

use crate::kube::client::{fmt_age, make_client};

#[derive(Debug, Clone, Serialize)]
pub(crate) struct EventInfo {
    #[serde(rename = "type")]
    pub event_type: String,
    pub reason: String,
    pub age: String,
    pub from: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct EventsResponse {
    pub events: Vec<EventInfo>,
}

pub(crate) async fn get_events(
    context: Option<String>,
    name: String,
    namespace: Option<String>,
) -> Result<EventsResponse, String> {
    let client = make_client(context).await?;

    let field_sel = match &namespace {
        Some(ns) => format!("involvedObject.name={},involvedObject.namespace={}", name, ns),
        None => format!("involvedObject.name={}", name),
    };
    let lp = ListParams::default().fields(&field_sel);

    let events = Api::<Event>::all(client)
        .list(&lp)
        .await
        .map_err(|e| format!("Failed to list events: {e}"))?;

    let filtered: Vec<EventInfo> = events
        .items
        .into_iter()
        .map(|ev| {
            let from = ev
                .source
                .as_ref()
                .and_then(|s| s.component.clone())
                .unwrap_or_else(|| "\u{2014}".to_string());
            EventInfo {
                event_type: ev.type_.clone().unwrap_or_else(|| "Normal".to_string()),
                reason: ev.reason.clone().unwrap_or_default(),
                age: fmt_age(&ev.metadata.creation_timestamp),
                from,
                message: ev.message.clone().unwrap_or_default(),
            }
        })
        .collect();

    Ok(EventsResponse { events: filtered })
}
