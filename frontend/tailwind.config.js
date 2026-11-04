/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07070D",
        surface: "rgba(255, 255, 255, 0.045)",
        "surface-strong": "rgba(255, 255, 255, 0.08)",
        border: "rgba(255, 255, 255, 0.10)",
        text: "#F4F3FA",
        "text-dim": "#A7A5B8",
        "text-faint": "#6E6C80",
        violet: "#8B5CF6",
        magenta: "#EC4899",
        cyan: "#22D3EE",
        amber: "#F59E0B",
        spotify: "#1DB954",
        "live-status": "#34D399",
        "mock-status": "#FBBF24",
        "error-status": "#F87171",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Sora", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        card: "20px",
        pill: "999px",
      },
      boxShadow: {
        glass: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        "glass-elevated": "0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
      },
      animation: {
        "gradient-shift": "gradientShift 8s ease infinite",
        "spin-slow": "spin 12s linear infinite",
      },
      keyframes: {
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
};

