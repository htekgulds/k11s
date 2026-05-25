import { DETAIL_TABS_MAP } from "../constants";
import { mono } from "../theme";

export function DetailTabs({ type, subTab, onGoTab }) {
  const dtabs = DETAIL_TABS_MAP[type] || DETAIL_TABS_MAP.default;

  return (
    <div style={{ display: "flex" }}>
      {dtabs.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onGoTab(t)}
          style={{
            background: "none",
            border: "none",
            borderBottom: subTab === t ? "2px solid #39ff8a" : "2px solid transparent",
            color: subTab === t ? "#dde" : "#2d4a6a",
            padding: "5px 13px",
            cursor: "pointer",
            ...mono,
            fontSize: "0.69rem",
            fontWeight: subTab === t ? 700 : 400,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
