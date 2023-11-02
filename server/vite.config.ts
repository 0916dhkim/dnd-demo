import { defineConfig } from "vite";
import devServer from "@hono/vite-dev-server";
import pages from "@hono/vite-cloudflare-pages";

export default defineConfig({
  plugins: [
    pages({
      outputDir: "../dist",
      emptyOutDir: false,
      minify: false,
    }),
    devServer({
      entry: "src/index.tsx",
    }),
  ],
  server: {
    port: 3000,
  },
});
