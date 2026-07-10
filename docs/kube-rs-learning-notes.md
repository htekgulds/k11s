# kube-rs Geliştirme Notları

> Kaynak: [Using Kubernetes with Rust — Shuttle Blog](https://www.shuttle.dev/blog/2024/10/22/using-kubernetes-with-rust)
> Yazar: Jubril Oyetunji, 22 October 2024

---

## İçindekiler

- [Bağımlılıklar](#bağımlılıklar)
- [Bağlantı & Client](#bağlantı--client)
- [Pod CRUD İşlemleri](#pod-crud-işlemleri)
- [Pod ile Etkileşim](#pod-ile-etkileşim)
- [Custom Resource Definition (CRD)](#custom-resource-definition-crd)
- [Watcher ile Değişiklikleri İzleme](#watcher-ile-değişiklikleri-izleme)
- [Port Forwarding](#port-forwarding)
- [k11s için Uygulama Pattern'leri](#k11s-için-uygulama-patternleri)

---

## Bağımlılıklar

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
kube = { version = "0.95.0", features = ["runtime", "derive", "ws"] }
k8s-openapi = { version = "0.23.0", features = ["latest"] }
serde_json = "1.0"
tracing = "0.1.37"
tokio-util = { version = "0.7.8", features = ["io"] }
tokio-stream = { version = "0.1.9", features = ["net"] }
tracing-subscriber = "0.3.17"
futures = "0.3.28"
anyhow = "1.0.71"
schemars = "0.8.12"
serde = { version = "1.0", features = ["derive"] }
yaml-rust2 = "0.8"
```

`kube` crate'inin `"runtime"`, `"derive"`, `"ws"` feature'ları:
- **runtime**: watcher, controller, reflector gibi yüksek seviye abstraksiyonlar
- **derive**: `CustomResource` derive macro'u için
- **ws**: WebSocket desteği (exec, portforward, attach)

---

## Bağlantı & Client

### Kubeconfig'den otomatik bağlan

```rust
use kube::{Client, Config};

// En basit:
let client = Client::try_default().await?;

// Kubeconfig'i elle kontrol etmek istersen:
let config = Config::infer().await?;
println!("Connected to cluster at {:?}", config.cluster_url.host().unwrap());
```

### API oluşturma

```rust
use k8s_openapi::api::core::v1::Pod;
use kube::{Api, Client};

let client = Client::try_default().await?;

// Default namespace'te çalış:
let pods: Api<Pod> = Api::default_namespaced(client.clone());

// Belirli bir namespace:
let pods: Api<Pod> = Api::namespaced(client.clone(), "kube-system");

// Tüm namespace'lerde:
let pods: Api<Pod> = Api::all(client.clone());
```

---

## Pod CRUD İşlemleri

### Pod Oluşturma (JSON ile — basit)

```rust
use serde_json::json;

let pod_json = json!({
    "apiVersion": "v1",
    "kind": "Pod",
    "metadata": { "name": "pong-pod" },
    "spec": {
        "containers": [{
            "name": "pong-container",
            "image": "ghcr.io/s1ntaxe770r/pong"
        }]
    }
});
let pod = serde_json::from_value(pod_json)?;
let pod = pods.create(&PostParams::default(), &pod).await?;
```

### Pod Oluşturma (Struct ile — önerilen, tip güvenli)

```rust
use k8s_openapi::api::core::v1::{Container, Pod, PodSpec};
use kube::api::{ObjectMeta, PostParams};

let pod = Pod {
    metadata: ObjectMeta {
        name: Some("pong-pod".to_string()),
        ..Default::default()
    },
    spec: Some(PodSpec {
        containers: vec![Container {
            name: "pong-container".to_string(),
            image: Some("ghcr.io/s1ntaxe770r/pong".to_string()),
            ..Default::default()
        }],
        ..Default::default()
    }),
    ..Default::default()
};

let pod = pods.create(&PostParams::default(), &pod).await;
match pod {
    Ok(p) => println!("created pod {}", p.metadata.name.unwrap()),
    Err(e) => println!("unable to create pod {}", e),
}
```

### Pod Listeleme

```rust
use kube::api::ListParams;

// Tümünü listele
let list_params = ListParams::default();
for pod in pods.list(&list_params).await? {
    println!("Found Pod {:?}", pod.metadata.name.unwrap());
}

// Label ile filtrele
let list_params = ListParams::default().labels("component=kube-apiserver");
for pod in pods.list(&list_params).await? {
    println!("Found Pod {:?}", pod.metadata.name.unwrap());
}
```

### Pod Güncelleme (Patch)

```rust
use kube::api::{Patch, PatchParams};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
struct PodPatch {
    metadata: PodMetadataPatch,
}

#[derive(Serialize, Deserialize, Debug)]
struct PodMetadataPatch {
    labels: std::collections::BTreeMap<String, String>,
}

let mut new_labels = std::collections::BTreeMap::new();
new_labels.insert("environment".to_string(), "production".to_string());

let patch = PodPatch {
    metadata: PodMetadataPatch { labels: new_labels },
};

let params = PatchParams::default();
let patched_pod = pods.patch("pong-pod", &params, &Patch::Merge(&patch)).await?;
```

### Pod Silme

```rust
use kube::api::DeleteParams;

pods.delete("pong-pod", &DeleteParams::default()).await?;
```

---

## Pod ile Etkileşim

### Log Çekme

```rust
let logs = pods.logs("nginx-example", &Default::default()).await?;
println!("Pod logs:\n{}", logs);
```

### Pod'un Hazır Olmasını Bekleme

```rust
use kube::runtime::wait::{await_condition, conditions::is_pod_running};

// Pod "Running" durumuna geçene kadar bekle
let running = await_condition(pods.clone(), "nginx-example", is_pod_running());
tokio::time::timeout(Duration::from_secs(60), running).await??;
```

Elle de kontrol edebilirsin:

```rust
let pod = pods.get("nginx-example").await?;
let status = pod.status.as_ref().expect("Pod status should be available");
let Some(phase) = &status.phase else {
    // henüz hazır değil, bekle
    continue;
};
if phase == "Running" {
    println!("Pod is running");
    break;
}
```

### Pod Detayı Getirme

```rust
let pod = pods.get("nginx-example").await?;
println!("Pod: {}", pod.name_any());
```

---

## Custom Resource Definition (CRD)

### CRD Tanımlama

```rust
use kube::CustomResource;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(CustomResource, Deserialize, Serialize, Clone, Debug, JsonSchema)]
#[kube(
    group = "experiments.gopherlabs.io",
    version = "v1",
    kind = "Crustacean",
    printcolumn = r#"{"name": "Habitat", "type": "string", "jsonPath": ".spec.habitat"}"#
)]
pub struct CrustaceanSpec {
    pub name: String,
    pub species: String,
    pub habitat: Option<String>,
}
```

### CRD Manifest Oluşturma (YAML çıktısı)

```rust
let larry = Crustacean::new(
    "larry",
    CrustaceanSpec {
        species: "lobster".to_string(),
        habitat: Some("Atlantic Ocean".to_string()),
    },
);

// JSON → YAML dönüşümü
let crd_json = serde_json::to_string(&larry)?;
let docs = YamlLoader::load_from_str(&crd_json)?;
let doc = &docs[0];
let mut out_str = String::new();
let mut emitter = YamlEmitter::new(&mut out_str);
emitter.dump(doc)?;
```

### CRD'yi Kümeye Uygulama

```rust
use kube::CustomResourceExt;

// CRD tanımını kümeye yükle
let crd = Crustacean::crd();
crds.create(&PostParams::default(), &crd).await?;

// CRD var mı kontrol et
async fn ensure_crd(client: &Client) -> Result<(), Box<dyn std::error::Error>> {
    let crds: Api<CustomResourceDefinition> = Api::all(client.clone());
    let lp = ListParams::default()
        .fields("metadata.name=crustaceans.experiments.gopherlabs.io");
    let existing_crds = crds.list(&lp).await?;

    if existing_crds.items.is_empty() {
        println!("CRD not found. Creating new CRD.");
        let crd = Crustacean::crd();
        crds.create(&PostParams::default(), &crd).await?;
    } else {
        println!("CRD already exists. Skipping creation.");
    }
    Ok(())
}
```

---

## Watcher ile Değişiklikleri İzleme

```rust
use futures::{StreamExt, TryStreamExt};
use kube::runtime::{watcher, WatchStreamExt};

let crustaceans: Api<Crustacean> = Api::all(client.clone());

// Watcher kurulumu — sadece apply edilen (create/update) objeleri al
let mut watcher = watcher(crustaceans, watcher::Config::default())
    .applied_objects()
    .boxed();

// Olay döngüsü
while let Some(crustacean) = watcher.try_next().await? {
    let name = crustacean.metadata.name.unwrap();
    info!("New crustacean detected: {}", name);

    // Her yeni Crustacean için Pod oluştur
    let pod = Pod { /* ... */ };
    pods.create(&PostParams::default(), &pod).await?;

    // Pod'un hazır olmasını bekle
    let running = await_condition(pods.clone(), &name, is_pod_running());
    tokio::time::timeout(Duration::from_secs(60), running).await??;
}
```

**Önemli metodlar:**
- `.applied_objects()` — sadece create/update (apply edilen) objeleri alır, delete'leri filtreler
- `.reflect()` — reflector olarak çalışır, tüm event'leri alır
- `.boxed()` — Stream'i heap allocate eder (trait object olarak kullanmak için)

---

## Port Forwarding

```rust
use std::net::SocketAddr;
use tokio::net::{TcpListener, TcpStream};
use tokio_stream::wrappers::TcpListenerStream;

// Local adres ve pod portu
let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
let pod_port = 80u16;

// Local TCP server
let server = TcpListenerStream::new(TcpListener::bind(addr).await?)
    .take_until(tokio::signal::ctrl_c())
    .try_for_each(|client_conn| async {
        let pods = pods.clone();
        tokio::spawn(async move {
            if let Err(e) = forward_connection(&pods, "nginx-example", 80, client_conn).await {
                error!("failed to forward connection: {}", e);
            }
        });
        Ok(())
    });

// Bağlantı yönlendirme
async fn forward_connection(
    pods: &Api<Pod>,
    pod_name: &str,
    port: u16,
    mut client_conn: TcpStream,
) -> anyhow::Result<()> {
    let mut forwarder = pods.portforward(pod_name, &[port]).await?;
    let mut upstream_conn = forwarder
        .take_stream(port)
        .context("port not found in forwarder")?;
    tokio::io::copy_bidirectional(&mut client_conn, &mut upstream_conn).await?;
    drop(upstream_conn);
    forwarder.join().await?;
    info!("connection closed");
    Ok(())
}
```

---

## k11s için Uygulama Pattern'leri

### 1. Kaynak Listeleme (Namespace seçici)
```rust
Api::namespaced(client, namespace)
    .list(&ListParams::default())
```
→ k11s'in kaynak listeleme ekranında her namespace için kullanılır.

### 2. Kaynak Güncelleme (Patch ile)
```rust
pods.patch("name", &PatchParams::default(), &Patch::Merge(&patch))
```
→ k11s'in YAML edit veya label düzenleme özelliğinde kullanılır.

### 3. Pod Logları
```rust
pods.logs("pod-name", &Default::default())
```
→ k11s'in log sekmesinde kullanılır.

### 4. Port Forwarding
```rust
pods.portforward("pod-name", &[port])
```
→ k11s'in pod shell / port forward özelliğinde kullanılır.

### 5. Watcher ile Canlı Güncelleme
```rust
watcher(api, watcher::Config::default())
    .applied_objects()
    .boxed()
```
→ k11s'te kaynak değişikliklerini canlı izlemek için kullanılır.

### 6. Pod Silme
```rust
pods.delete("name", &DeleteParams::default())
```
→ k11s'in kaynak silme işlemleri için kullanılır.

---

## Notlar

- `kube-rs` => `kube::Api`, `kube::Client`, `k8s_openapi` tipleri — **kubectl subprocess yok**
- k11s'te tüm Kubernetes API etkileşimleri bu pattern'lerle yapılmalı
- Pod struct'ları `k8s_openapi::api::core::v1` modülünde
- CRD'ler için `kube::CustomResource` derive macro'u
- Asenkron operasyonlar için `tokio` + `futures` crate'leri
- Port forwarding, log akışı ve exec gibi streaming işlemler WebSocket (`ws` feature) kullanıyor
