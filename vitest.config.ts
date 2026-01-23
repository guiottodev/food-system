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
      "@": resolve(__dirname, "."),
      "@prisma/client": resolve(
        __dirname,
        "node_modules/.prisma/client/index.js"
      ),
    },
  },
});
