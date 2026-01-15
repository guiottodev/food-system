import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    conditions: ["node"],
    alias: {
      "@prisma/client": resolve(
        __dirname,
        "node_modules/.prisma/client/index.js"
      ),
    },
  },
});
