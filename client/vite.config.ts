import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      "next/navigation": path.resolve(__dirname, "src/lib/next-navigation.ts"),
      "next/link": path.resolve(__dirname, "src/lib/next-link.tsx"),
    },
  },
});
