/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Bind to 127.0.0.1 (not "localhost"): Spotify no longer accepts "localhost"
// redirect URIs, so the whole app consistently runs on the loopback IP.
const BACKEND_URL = process.env.ECHORA_BACKEND_URL ?? "http://127.0.0.1:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      // Frontend calls relative /api/* URLs; Vite forwards them to Express.
      "/api": { target: BACKEND_URL, changeOrigin: false },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("framer-motion") ||
              id.includes("motion-dom") ||
              id.includes("motion-utils")
            ) {
              return "vendor-motion";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("\\react\\") ||
              id.includes("\\react-dom\\") ||
              id.includes("scheduler")
            ) {
              return "vendor-react";
            }
          }
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
  },
});
