import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendTarget =
  process.env.VITE_API_PROXY_TARGET || "http://backend:5000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
      // QR codes and payment screenshots are served by Flask's
      // default /static route (see backend/app/static/uploads/...).
      // Without this, the frontend's own /static/... requests never
      // reach the backend at all — the Vite dev server has no static
      // file at that path, so it falls back to serving index.html,
      // and the browser tries (and fails) to render HTML as an
      // image. Same target/host as the /api proxy above, since it's
      // the same backend serving both.
      "/static": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});