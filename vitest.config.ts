import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit layer (Architecture §14, Layer 1): pure logic in packages/core.
// Integration specs (*.int.test.ts) need a DB and run via vitest.int.config.ts.
export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.test.ts"],
    exclude: ["**/*.int.test.ts", "**/node_modules/**"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@parvaordo/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
      "@parvaordo/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
    },
  },
});
