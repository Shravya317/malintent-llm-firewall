import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/v1': {
        target: 'https://malintent-backend-211874411068.asia-south1.run.app',
        changeOrigin: true,
      }
    }
  }
});
