import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    "process.env": JSON.stringify({
      NODE_ENV: process.env.NODE_ENV || "development",
    }),
    global: "globalThis",
  },
  server: {
    host: true,
    port: 5193,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5280",
        changeOrigin: true,
        secure: false,
        ws: true,
        // Não usar rewrite - manter o /api no caminho
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("[PROXY ERROR]", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log(
              "[PROXY REQUEST]",
              req.method,
              req.url,
              "→",
              proxyReq.path
            );
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log("[PROXY RESPONSE]", proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
  preview: {
    port: 5193,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
