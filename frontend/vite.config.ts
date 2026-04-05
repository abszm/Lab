import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

const backendProxyTarget = process.env.VITE_BACKEND_PROXY_TARGET || "http://localhost:3001";

export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: [".monkeycode-ai.online"],
    proxy: {
      "/api": {
        target: backendProxyTarget,
        changeOrigin: true
      },
      "/socket.io": {
        target: backendProxyTarget,
        ws: true,
        changeOrigin: true
      }
    }
  }
});
