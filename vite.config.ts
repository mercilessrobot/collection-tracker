import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The site is served from https://mercilessrobot.github.io/collection-tracker/
// so all asset URLs must be prefixed with the repo name.
export default defineConfig({
  base: "/collection-tracker/",
  plugins: [react()],
});
