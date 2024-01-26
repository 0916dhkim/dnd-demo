import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Allow external access
    proxy: {
      "/api": {
        target: "http://localhost:3000",
      },
    },
  },
});
