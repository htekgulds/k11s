import { Loader2 } from "lucide-react";

export function Spinner() {
  return (
    <Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} />
  );
}
