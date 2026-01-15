import { existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });
process.env.PRISMA_CLIENT_ENGINE_TYPE = "library";
// Ensure Node runtime detection (avoid Edge/DataProxy paths in test envs).
delete (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime;

const enginePath = join(
  process.cwd(),
  "node_modules",
  "@prisma",
  "engines",
  "query_engine-windows.dll.node"
);
if (existsSync(enginePath)) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
}
