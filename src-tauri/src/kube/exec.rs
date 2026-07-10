use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::OnceLock;

use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;
use tauri::Emitter;

struct ShellSession {
    stdin: tokio::process::ChildStdin,
    child: tokio::process::Child,
}

static NEXT_SHELL_ID: AtomicU64 = AtomicU64::new(1);

fn shell_sessions() -> &'static Mutex<HashMap<String, ShellSession>> {
    static SESSIONS: OnceLock<Mutex<HashMap<String, ShellSession>>> =
        OnceLock::new();
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Start an interactive shell session in a pod container.
/// Returns a session_id string used for subsequent stdin writes and cleanup.
pub(crate) async fn exec_pod_shell(
    context: Option<String>,
    namespace: String,
    pod: String,
    container: Option<String>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let session_id = format!("shell-{}", NEXT_SHELL_ID.fetch_add(1, Ordering::Relaxed));

    // Build `kubectl exec -i <pod> -n <ns> [-c <container>] -- sh`
    let mut cmd = Command::new("kubectl");
    if let Some(ref ctx) = context {
        cmd.arg("--context").arg(ctx);
    }
    cmd.arg("exec")
        .arg("-i")
        .arg(&pod)
        .arg("-n")
        .arg(&namespace);
    if let Some(ref c) = container {
        cmd.arg("-c").arg(c);
    }
    // Try bash first, fall back to sh
    cmd.arg("--")
        .args(["sh", "-c", "if command -v bash >/dev/null 2>&1; then exec bash; else exec sh; fi"]);

    cmd.stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn kubectl exec: {e}"))?;

    let stdin = child.stdin.take().ok_or("Failed to capture stdin")?;
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    // Spawn stdout reader ─ emits "shell-output" events (type: "stdout")
    let sid_out = session_id.clone();
    let ah_out = app_handle.clone();
    tokio::spawn(async move {
        let reader = BufReader::new(stdout);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = ah_out.emit(
                "shell-output",
                serde_json::json!({
                    "session_id": sid_out,
                    "type": "stdout",
                    "data": line,
                }),
            );
        }
        // stdout closed → process exited
        let _ = ah_out.emit(
            "shell-output",
            serde_json::json!({
                "session_id": sid_out,
                "type": "exit",
                "data": null,
            }),
        );
    });

    // Spawn stderr reader ─ emits "shell-output" events (type: "stderr")
    let sid_err = session_id.clone();
    let ah_err = app_handle.clone();
    tokio::spawn(async move {
        let reader = BufReader::new(stderr);
        let mut lines = reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = ah_err.emit(
                "shell-output",
                serde_json::json!({
                    "session_id": sid_err,
                    "type": "stderr",
                    "data": line,
                }),
            );
        }
    });

    // Register session
    let session = ShellSession { stdin, child };
    shell_sessions()
        .lock()
        .await
        .insert(session_id.clone(), session);

    Ok(session_id)
}

/// Write data (e.g. a command line) to the shell's stdin.
pub(crate) async fn exec_pod_stdin(session_id: String, data: String) -> Result<(), String> {
    let mut sessions = shell_sessions().lock().await;
    let session = sessions
        .get_mut(&session_id)
        .ok_or_else(|| "Shell session not found".to_string())?;
    session
        .stdin
        .write_all(data.as_bytes())
        .await
        .map_err(|e| format!("Failed to write stdin: {e}"))?;
    session
        .stdin
        .flush()
        .await
        .map_err(|e| format!("Failed to flush stdin: {e}"))?;
    Ok(())
}

/// Terminate a shell session by closing its stdin and killing the process.
pub(crate) async fn exec_pod_stop(session_id: String) -> Result<(), String> {
    let mut sessions = shell_sessions().lock().await;
    if let Some(mut session) = sessions.remove(&session_id) {
        // Closing stdin signals EOF to the shell process
        let _ = session.stdin.shutdown().await;
        // Kill the child process
        let _ = session.child.start_kill();
        // Reap in background
        tokio::spawn(async move {
            let _ = session.child.wait().await;
        });
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}
