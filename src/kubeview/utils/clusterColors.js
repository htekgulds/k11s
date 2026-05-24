export const CLUSTER_COLORS = [
  "#ff4d4d",
  "#fb923c",
  "#f5c518",
  "#39ff8a",
  "#7dd3fc",
  "#c4b5fd",
  "#f9a8d4",
  "#67e8f9",
  "#86efac",
  "#fde68a",
  "#fdba74",
  "#a5f3fc",
];

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function assignClusterColors(clusters) {
  return clusters.map((c) => ({
    ...c,
    color: CLUSTER_COLORS[hashString(c.id) % CLUSTER_COLORS.length],
  }));
}

export function getClusterColor(clusters, clusterId) {
  return clusters.find((c) => c.id === clusterId)?.color || CLUSTER_COLORS[0];
}

export function detailTabId(clusterId, resourceType, namespace, name) {
  return `detail·${clusterId}·${resourceType}·${namespace || "_"}·${name}`;
}
