import { NS_COLORS, kindColorMap } from "../theme";

const nsMap = {};
let nsIdx = 0;

export function nsColor(ns) {
  if (!nsMap[ns]) {
    nsMap[ns] = NS_COLORS[nsIdx++ % NS_COLORS.length];
  }
  return nsMap[ns];
}

export function kindColor(k) {
  return kindColorMap[k] || "#888";
}
