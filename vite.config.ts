import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// relative base so the same build works on localhost and on GitHub Pages (/daily-plan/)
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 5178 },
});
