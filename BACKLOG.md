# k11s Backlog

Issues organized by category, prioritized for implementation.

---

## 📋 Next Up — New Features

### Tier 1 — High Value

### N1 — Cluster Dashboard (karşılama sayfası)
**Priority: High**

Bir cluster'a bağlanınca boş node listesi yerine genel durumu gösteren bir dashboard açılsın:
- Node sağlık özeti (Ready/NotReady sayıları, CPU/Mem capacity)
- Kaynak sayıları (Pod, Deployment, Service, Ingress, ConfigMap, Secret vs.)
- Son N event (warning/error öncelikli)
- Cluster versiyonu + platform bilgisi (EKS/GKE/Kind vs.)
- Grafana tarzı mini stat card'lar

**Files:** `src/kubeview/features/dashboard/` (yeni), `src-tauri/src/kube/dashboard.rs` (yeni), `lib.rs` (yeni command)

### N2 — Pod Resource Usage (CPU/Mem grafikleri)
**Priority: Medium**

Pod detay sayfasında metrics-server'dan CPU & memory kullanımını göster:
- `kubectl top pod` eşdeğeri (kube-rs metrics API)
- Mini çizgi grafik (son 5-10 ölçüm)
- Request/Limit karşılaştırması
- Container bazında kırılım

**Depends on:** metrics-server cluster'da kurulu olmalı

### N3 — Helm Release Görüntüleme
**Priority: Medium**

Cluster'daki Helm release'leri listeleme ve detay görüntüleme:
- `helm list` yerine native Helm SDK veya `helm` subprocess ile
- Release adı, namespace, chart, revizyon, durum, deploy zamanı
- Detay: values, manifest dosyaları, revision geçmişi
- Rollback tetikleme UI'dan

### N4 — File Drag & Drop YAML Apply
**Priority: Medium**

YAML/JSON dosyasını uygulama penceresine sürükleyip apply et:
- Dosya drop → YAML önizleme paneli açılır
- Apply before/after diff gösterimi
- Namespace override seçeneği
- Tauri drag-and-drop event'leri ile

### N5 — Export to File
**Priority: Low**

Her görünümden (Log, YAML, Describe, Event) içeriği dosyaya kaydet:
- Log/YAML/Describe/Events tab'larında "Export" butonu
- Tauri `dialog.save()` ile native save dialog
- Format içeriğe göre (.txt, .yaml, .json)

---

### Tier 2 — Medium Value

### N6 — ConfigMap/Secret Inline Editor
Key-value form üzerinden ConfigMap ve Secret düzenleme (YAML yazmadan):
- Key:value çiftlerini tablo halinde göster
- Yeni key ekle, mevcutu düzenle, sil
- Secret'lar için masked/değer toggle
- Apply button → patch

### N7 — Recent Resources (geçmiş)
Son bakılan kaynakların listesi:
- Sidebar altında veya ayrı panel
- Kaynak tipi + adı + namespace + zaman damgası
- localStorage'a kaydet, oturumlar arası kalıcı

### N8 — Ek Kaynak Tipleri (CronJob, Job, DaemonSet, HPA)
**Priority: Medium**

Sidebar'daki ortak kaynak listesine yeni tipler ekle:
- **CronJob** — schedule, last schedule, suspend durumu
- **Job** — completions, parallelism, duration
- **DaemonSet** — desired/current/ready/available
- **HPA** — min/max/replicas, target utilization

Her biri için Rust listeleme + kolon tanımı + detay tab'ları.

### N9 — Cluster Events Feed
Cluster-wide events sayfası:
- Tüm namespace'lerden event'ler
- Tip (Normal/Warning) ve kaynak tipine göre filtre
- Real-time güncelleme (watcher ile)
- Timeline görünümü

### N10 — App Settings
Kullanıcı tercihleri paneli:
- Varsayılan namespace
- Tema takibi (system/light/dark)
- Refresh interval
- Görünen kolon tercihleri (UX4'ün devamı)
- localStorage / Tauri store ile persist

---

### Tier 3 — Quick Wins

### N11 — Node → Pod Drilldown
Node detayında o node'da çalışan pod'ları listele:
- `fieldSelector: spec.nodeName=<node>` ile filtre
- Tablo görünümü, pod detaya tıklanabilir

### N12 — CronJob Manual Trigger
UI'dan CronJob'u elle tetikle:
- "Run Now" butonu → anlık Job oluştur
- `cronjobs.create_job()` API çağrısı

### N13 — Sidebar Resource Count Badges
Her kaynak tipinin yanında canlı sayı göster:
- Watcher event'leri ile güncellenen sayaç
- Loading'de spinner, 0'da gri badge

### N14 — Namespace Switcher Header
Header çubuğunda hızlı namespace değiştirici:
- Header'da compact dropdown, tüm namespace'leri göster
- Yazmaya başlayınca fuzzy filtrele
- Tüm kaynak görünümlerinde geçerli (küresel namespace filtresi)
- Sidebar'daki namespace paneli artık gerekli değil (header halleti)
- Sık kullanılan son namespace'ler otomatik üstte

---

## ✅ Completed — Original Backlog

## 🔧 Features

### F1 — Dynamic k8s resource discovery + universal command palette
**Priority: High**

Instead of a hardcoded `RESOURCE_TYPES` list, query the live cluster's API discovery endpoint to get all available resources. Categorize them:

- **Common resources** (Pods, Deployments, Services, Nodes, ConfigMaps, Secrets, Ingresses, StatefulSets, PVCs, DaemonSets, Jobs, CronJobs, HPAs, NetworkPolicies) → dedicated menu items with icons and shortcuts
- **Other resources** → collapsible section that dynamically lists everything else
- **Command palette** (`Cmd+K`) should search across **all** resources (not just common ones) — type any resource name or pod name to navigate there

### F2 — Delete resources from UI
**Rationale:** No way to delete a pod/deployment/secret/etc. without switching to terminal.

- Add delete button in detail view header
- Confirmation dialog before deletion
- Support for `--grace-period` and `--force` options

### F3 — Container selection for shell exec
**Rationale:** Multi-container pods always exec into the first container.

- Dropdown to choose which container to exec into
- Show container name, image, and status in the selector

### F4 — Container selection for logs
**Rationale:** Same as shell — always first container.

- Dropdown to choose container for log viewing
- Show container name + image

### F5 — Pod log streaming (tail -f)
**Rationale:** Logs are fetched once (snapshot); no real-time streaming.

- Stream logs live via watcher or polling
- Toggle between snapshot and streaming mode
- Show log timestamps as they arrive

### F6 — Previous-container logs (`--previous`)
**Rationale:** Restarted pods can't see old logs.

- Button to fetch `--previous` container logs
- Side-by-side or split-view comparison

### F7 — `kubectl describe` action
**Rationale:** Describe output is often more useful than raw YAML for debugging.

- Add "Describe" tab alongside YAML/Logs/Events
- Render structured describe output with syntax highlighting

### F8 — Port forwarding
**Rationale:** Click a port on a Service/Pod to forward locally.

- Click a port number to start a port-forward session
- Show active forwards with local port, remote port, status
- Stop button per forward

### F9 — Rollout controls for Deployments/StatefulSets
**Rationale:** Restart, undo, pause/resume from UI.

- Restart rollout button
- Undo rollout (rollback to previous revision)
- Pause/resume rollout
- Show rollout history / revision numbers

### F10 — Copy resource name/namespace to clipboard
**Rationale:** Useful when pasting into terminal commands or other tools.

- Right-click or button to copy name, namespace, or `type/name`

---

## 🎨 UX Improvements

### UX1 — Keyboard shortcuts reference panel
**Rationale:** `Cmd+K` palette exists, but no help overlay showing all shortcuts.

- `?` or `Cmd+/` to toggle a shortcuts modal
- List all registered shortcuts with descriptions

### UX2 — Global resource search
**Rationale:** Palette only switches clusters/resources — can't search for a pod by name across all namespaces.

- Expand palette to search resource names, labels, namespaces
- Fuzzy search across all loaded resource data
- Navigate directly to a matching resource

### UX3 — Right-click context menu
**Rationale:** Quick actions (copy name, exec, describe, delete) are all missing.

- Context menu on resource list rows and detail header
- Actions: Copy name, Copy namespace, Shell, Logs, Describe, Delete, YAML

### UX4 — Configurable columns in resource tables
**Rationale:** `COLUMNS` in `constants.jsx` is hardcoded; users can't add/remove columns.

- Allow toggling columns on/off per resource type
- Persist preferences locally

### UX5 — Success feedback on kubeconfig add
**Rationale:** `add_validated_path` silently skips duplicates (stderr only); no toast/banner.

- Show success toast when kubeconfig is added
- Show warning when path is duplicate or invalid

### UX6 — Namespace badge in detail tabs
**Rationale:** Tab labels show `obj.name` but not namespace, making tabs ambiguous when same-named resources exist in different namespaces.

- Show `namespace/name` format in tab labels
- Muted namespace prefix, bold resource name

### UX7 — Column resize / reorder
**Rationale:** Table columns are fixed-width with ellipsis overflow.

- Drag-to-resize column widths
- Drag-to-reorder columns
- Persist column layout

---

## 🐛 Bugs

### B1 — LogsTab re-fetches on every render
**Where:** `LogsTab.jsx:12, 30`

The `load` callback depends on `logs` state — changes every time logs are set, creating unnecessary cycles. Works by accident but fragile.

### B2 — Node pod count always 0 in watchers
**Where:** `watchers.rs:162`

Node watchers call `node_to_info(n, 0)` — pod counts are never updated live, always show `0/max`.

### B3 — Events filter is client-side only
**Where:** `k8s.rs:780-812`

`get_events` fetches ALL cluster events then filters in Rust — doesn't scale past a few hundred events. Should use server-side field selectors.

### B4 — Stale detail tab after resource deletion
**Where:** `KubeClient.jsx:411-413`

If a pod detail tab is open and the pod gets deleted, the tab stays open with stale data from `resolveDetailObject`.

### B5 — `connected` state can get stuck
**Where:** `KubeClient.jsx:211-217`

The 10-second health-check interval runs even when there's no network; failing checks don't trigger reconnection logic.

---

## 🔒 Security

### S1 — CSP is null
**Severity:** Medium

`tauri.conf.json` has `\"csp\": null` — no Content Security Policy. If any user-controlled content ever renders as HTML, XSS is possible. Set a restrictive CSP.

### S2 — No input validation on exec args
**Severity:** Low

Pod/namespace names are passed directly to `kubectl exec`. Should validate against DNS-1123 patterns to catch typos early.

---

## 🏗 Architecture

### A1 — Bump kube-rs from 0.98
Current `kube = \"0.98\"` is several versions behind. Newer versions have better error handling, improved watch APIs, and reduced boilerplate.

### A2 — Move `kubectl exec` to pure kube-rs
`exec_pod_shell` spawns a `kubectl` binary subprocess. Using kube-rs' native exec API would be more robust, cross-platform, and avoid the subprocess overhead.

### A3 — Add build/test CI pipeline
No GitHub Actions workflow to verify Rust compiles or frontend builds. A minimal CI would prevent regressions.
