import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    bin: "src/bin.ts",
    index: "src/index.ts",
  },
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  clean: true,
  splitting: true,
  sourcemap: false,
  dts: true,
  noExternal: [
    "@shiprank/engine",
    "@shiprank/compile",
    "@shiprank/database",
  ],
  onSuccess: "chmod +x dist/bin.js",
});
