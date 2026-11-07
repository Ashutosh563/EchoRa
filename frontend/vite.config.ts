/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Bind to 127.0.0.1 (not "localhost"): Spotify no longer accepts "localhost"
// redirect URIs, so the whole app consistently runs on the loopback IP.
const BACKEND_URL = process.env.SONORA_BACKEND_URL ?? "http://127.0.0.1:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: Number(process.env.VITE_PORT) || 5173,
    strictPort: true,
    proxy: {
      // Frontend calls relative /api/* URLs; Vite forwards them to Express.
      "/api": { target: BACKEND_URL, changeOrigin: false },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
  },
});

