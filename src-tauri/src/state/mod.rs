use std::collections::HashMap;
use std::sync::Mutex;
use tokio_util::sync::CancellationToken;

pub(crate) struct PortForwardManager {
    pub forwards: Mutex<HashMap<String, (crate::kube::PortForwardInfo, CancellationToken)>>,
}

impl PortForwardManager {
    pub fn new() -> Self {
        Self {
            forwards: Mutex::new(HashMap::new()),
        }
    }
}

pub(crate) struct LogStreamManager {
    pub streams: Mutex<HashMap<String, CancellationToken>>,
}

impl LogStreamManager {
    pub fn new() -> Self {
        Self {
            streams: Mutex::new(HashMap::new()),
        }
    }
}
