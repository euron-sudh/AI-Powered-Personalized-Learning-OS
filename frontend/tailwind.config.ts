import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // EduAI Design System - mapped from CSS variables
        "edu-bg-base": "var(--bg-base)",
        "edu-bg-surface": "var(--bg-surface)",
        "edu-bg-raised": "var(--bg-raised)",
        "edu-bg-deep": "var(--bg-deep)",
        "edu-border": "var(--border)",
        "edu-border-mid": "var(--border-mid)",
        "edu-accent": "var(--accent)",
        "edu-accent-dim": "var(--accent-dim)",
        "edu-accent-soft": "var(--accent-soft)",
        "edu-text-primary": "var(--text-primary)",
        "edu-text-body": "var(--text-body)",
        "edu-text-muted": "var(--text-muted)",
        "edu-text-faint": "var(--text-faint)",
        "edu-green": "var(--green)",
        "edu-green-bg": "var(--green-bg)",
        "edu-amber": "var(--amber)",
        "edu-amber-bg": "var(--amber-bg)",
        "edu-red": "var(--red)",
        "edu-red-bg": "var(--red-bg)",
        // Direct color values for arbitrary bracket notation support
        "#0d1117": "#0d1117",
        "#161b27": "#161b27",
        "#1e2330": "#1e2330",
        "#0a0d14": "#0a0d14",
        "#1a1f2e": "#1a1f2e",
        "#2a2d45": "#2a2d45",
        "#5b5eff": "#5b5eff",
        "#3d3faa": "#3d3faa",
        "#1a1f35": "#1a1f35",
        "#c5c9d6": "#c5c9d6",
        "#6b7280": "#6b7280",
        "#3a3f55": "#3a3f55",
        "#1d9e75": "#1d9e75",
        "#0f2a1f": "#0f2a1f",
        "#ef9f27": "#ef9f27",
        "#1f1a0f": "#1f1a0f",
        "#e24b4a": "#e24b4a",
        "#2a1a1a": "#2a1a1a",
        "#a8aaee": "#a8aaee",
        "#111520": "#111520",
        "#0d1424": "#0d1424",
      },
      backgroundColor: {
        "edu-base": "var(--bg-base)",
        "edu-surface": "var(--bg-surface)",
        "edu-raised": "var(--bg-raised)",
        "edu-deep": "var(--bg-deep)",
      },
      textColor: {
        "edu-primary": "var(--text-primary)",
        "edu-body": "var(--text-body)",
        "edu-muted": "var(--text-muted)",
      },
      borderColor: {
        "edu-border": "var(--border)",
      },
    },
  },
  plugins: [],
};

export default config;
