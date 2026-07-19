/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // k11s custom colors
        bg: {
          primary: "#0a0f18",
          secondary: "#050910",
          tertiary: "#080e18",
        },
        border: {
          primary: "#0a1018",
          secondary: "#0e1f2e",
          accent: "#1a3a4a",
        },
        text: {
          primary: "#c8d6e5",
          secondary: "#4a7a8a",
          muted: "#1e3a52",
        },
        accent: {
          green: "#39ff8a",
          cyan: "#7dd3fc",
          amber: "#f5c518",
          red: "#ff6b6b",
          pink: "#fb923c",
        },
        status: {
          running: "#39ff8a",
          pending: "#f5c518",
          error: "#ff6b6b",
          unknown: "#6b7280",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "spin": "spin 1s linear infinite",
        "fade-in": "fadeIn 0.13s ease",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
}