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
        sans: ["var(--font-poppins)", "var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      colors: {
        // Direct hex values for arbitrary bracket notation
        "0d1117": "#0d1117",
        "161b27": "#161b27",
        "1e2330": "#1e2330",
        "0a0d14": "#0a0d14",
        "1a1f2e": "#1a1f2e",
        "2a2d45": "#2a2d45",
        "5b5eff": "#5b5eff",
        "3d3faa": "#3d3faa",
        "1a1f35": "#1a1f35",
        "c5c9d6": "#c5c9d6",
        "6b7280": "#6b7280",
        "3a3f55": "#3a3f55",
        "1d9e75": "#1d9e75",
        "0f2a1f": "#0f2a1f",
        "ef9f27": "#ef9f27",
        "1f1a0f": "#1f1a0f",
        "e24b4a": "#e24b4a",
        "2a1a1a": "#2a1a1a",
        "a8aaee": "#a8aaee",
        "111520": "#111520",
        "0d1424": "#0d1424",
      },
    },
  },
  plugins: [],
};

export default config;
