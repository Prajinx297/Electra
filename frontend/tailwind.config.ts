import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        "vote-red": "var(--vote-red)",
        "civic-gold": "var(--civic-gold)",
        "signal-green": "var(--signal-green)",
        "neural-blue": "var(--neural-blue)",
        muted: "var(--muted)"
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'Libre Franklin'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      boxShadow: {
        civic: "0 24px 60px rgba(0, 0, 0, 0.28)"
      }
    }
  },
  plugins: []
} satisfies Config;
