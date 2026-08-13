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
  dts: false,
  noExternal: ["@shiprank/engine", "@shiprank/database"],
  onSuccess: "chmod +x dist/bin.js",
});
