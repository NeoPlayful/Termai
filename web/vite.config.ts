import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.svg"],
      manifest: {
        name: "Termai",
        short_name: "Termai",
        display: "standalone",
        theme_color: "#000000",
        background_color: "#000000",
        icons: [
          { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:6688",
      "/ws": {
        target: "ws://localhost:6688",
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
