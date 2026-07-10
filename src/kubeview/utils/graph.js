import { COMMON_RESOURCES } from "../constants";

export function buildGraph(obj, type, allData) {
  const nodes = [];
  const edges = [];
  const add = (id, lbl, kind, status, ns) => {
    if (!nodes.find((n) => n.id === id)) nodes.push({ id, label: lbl, kind, status, ns });
  };
  const link = (a, b, lbl = "") => edges.push({ from: a, to: b, label: lbl });

  if (type === "deployments") {
    add(obj.name, obj.name, "Deployment", obj.ready?.startsWith("0") ? "error" : "ok", obj.namespace);
    (allData.pods || [])
      .filter((p) => p.name.includes(obj.name.split("-")[0]) && p.namespace === obj.namespace)
      .slice(0, 3)
      .forEach((p) => {
        add(p.name, p.name, "Pod", p.status, p.namespace);
        link(obj.name, p.name, "owns");
      });
    const svc = (allData.services || []).find(
      (s) => s.namespace === obj.namespace && s.name.includes(obj.name.split("-")[0]),
    );
    const ing = (allData.ingresses || []).find((i) => i.namespace === obj.namespace);
    const cm = (allData.configmaps || []).find(
      (c) => c.namespace === obj.namespace && c.name.includes(obj.name.split("-")[0]),
    );
    const sec = (allData.secrets || []).find(
      (s) => s.namespace === obj.namespace && s.name.includes(obj.name.split("-")[0]),
    );
    if (svc) {
      add(svc.name, svc.name, "Service", "ok", svc.namespace);
      link(svc.name, obj.name, "routes to");
    }
    if (ing) {
      add(ing.name, ing.name, "Ingress", "ok", ing.namespace);
      link(ing.name, svc?.name || obj.name, "→");
    }
    if (cm) {
      add(cm.name, cm.name, "ConfigMap", "ok", cm.namespace);
      link(obj.name, cm.name, "mounts");
    }
    if (sec) {
      add(sec.name, sec.name, "Secret", "ok", sec.namespace);
      link(obj.name, sec.name, "uses");
    }
  } else if (type === "pods") {
    add(obj.name, obj.name, "Pod", obj.status, obj.namespace);
    const dep = (allData.deployments || []).find(
      (d) => obj.name.includes(d.name.split("-")[0]) && d.namespace === obj.namespace,
    );
    const sts = (allData.statefulsets || []).find(
      (d) => obj.name.startsWith(d.name) && d.namespace === obj.namespace,
    );
    const svc = (allData.services || []).find((s) => s.namespace === obj.namespace);
    const nd = (allData.nodes || []).find((n) => n.name === obj.node);
    if (dep) {
      add(dep.name, dep.name, "Deployment", dep.ready?.startsWith("0") ? "error" : "ok", dep.namespace);
      link(dep.name, obj.name, "owns");
    }
    if (sts) {
      add(sts.name, sts.name, "StatefulSet", sts.ready?.startsWith("0") ? "error" : "ok", sts.namespace);
      link(sts.name, obj.name, "owns");
    }
    if (svc) {
      add(svc.name, svc.name, "Service", "ok", svc.namespace);
      link(svc.name, obj.name, "selects");
    }
    if (nd) {
      add(nd.name, nd.name, "Node", nd.status, nd.name);
      link(obj.name, nd.name, "runs on");
    }
  } else {
    add(
      obj.name,
      obj.name,
      COMMON_RESOURCES.find((r) => r.key === type)?.label.replace(/s$/, "") || type,
      "ok",
      obj.namespace || "",
    );
  }
  return { nodes, edges };
}

export function getRelated(obj, type, allData) {
  const rel = [];
  if (type === "pods") {
    const dep = (allData.deployments || []).find(
      (d) => obj.name.includes(d.name.split("-")[0]) && d.namespace === obj.namespace,
    );
    const svc = (allData.services || []).find((s) => s.namespace === obj.namespace);
    const nd = (allData.nodes || []).find((n) => n.name === obj.node);
    if (dep)
      rel.push({
        kind: "Deployment",
        name: dep.name,
        ns: dep.namespace,
        status: dep.ready?.startsWith("0") ? "CrashLoopBackOff" : "Ready",
        resourceType: "deployments",
        obj: dep,
      });
    if (svc)
      rel.push({
        kind: "Service",
        name: svc.name,
        ns: svc.namespace,
        status: "Ready",
        resourceType: "services",
        obj: svc,
      });
    if (nd)
      rel.push({
        kind: "Node",
        name: nd.name,
        ns: "",
        status: nd.status,
        resourceType: "nodes",
        obj: nd,
      });
  } else if (type === "deployments") {
    (allData.pods || [])
      .filter((p) => p.name.includes(obj.name.split("-")[0]) && p.namespace === obj.namespace)
      .forEach((p) =>
        rel.push({
          kind: "Pod",
          name: p.name,
          ns: p.namespace,
          status: p.status,
          resourceType: "pods",
          obj: p,
        }),
      );
    const svc = (allData.services || []).find(
      (s) => s.namespace === obj.namespace && s.name.includes(obj.name.split("-")[0]),
    );
    const sec = (allData.secrets || []).find(
      (s) => s.namespace === obj.namespace && s.name.includes(obj.name.split("-")[0]),
    );
    const cm = (allData.configmaps || []).find(
      (c) => c.namespace === obj.namespace && c.name.includes(obj.name.split("-")[0]),
    );
    if (svc)
      rel.push({
        kind: "Service",
        name: svc.name,
        ns: svc.namespace,
        status: "Ready",
        resourceType: "services",
        obj: svc,
      });
    if (sec)
      rel.push({
        kind: "Secret",
        name: sec.name,
        ns: sec.namespace,
        status: "Ready",
        resourceType: "secrets",
        obj: sec,
      });
    if (cm)
      rel.push({
        kind: "ConfigMap",
        name: cm.name,
        ns: cm.namespace,
        status: "Ready",
        resourceType: "configmaps",
        obj: cm,
      });
  } else if (type === "statefulsets") {
    (allData.pods || [])
      .filter((p) => p.name.startsWith(obj.name) && p.namespace === obj.namespace)
      .forEach((p) =>
        rel.push({
          kind: "Pod",
          name: p.name,
          ns: p.namespace,
          status: p.status,
          resourceType: "pods",
          obj: p,
        }),
      );
    (allData.pvcs || [])
      .filter((p) => p.namespace === obj.namespace && p.name.includes(obj.name))
      .forEach((p) =>
        rel.push({
          kind: "PVC",
          name: p.name,
          ns: p.namespace,
          status: p.status,
          resourceType: "pvcs",
          obj: p,
        }),
      );
  }
  return rel;
}
