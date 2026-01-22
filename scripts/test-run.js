const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const dotenv = require("dotenv");

function run(command) {
  execSync(command, {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "test" },
  });
}

const rootDir = process.cwd();
const envPath = path.join(rootDir, ".env.test");
const dbPath = path.join(rootDir, "data", "test.sqlite");
const prismaClientIndex = path.join(
  rootDir,
  "node_modules",
  ".prisma",
  "client",
  "index.js"
);
const enginePath = path.join(
  rootDir,
  "node_modules",
  "@prisma",
  "engines",
  "query_engine-windows.dll.node"
);

dotenv.config({ path: envPath });
process.env.NODE_ENV = "test";
process.env.PRISMA_CLIENT_ENGINE_TYPE = "library";
process.env.VITEST_MAX_THREADS = "1";
process.env.VITEST_MIN_THREADS = "1";
if (fs.existsSync(enginePath)) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
}

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, "");
}

run("npx prisma generate --no-engine");
if (fs.existsSync(prismaClientIndex)) {
  const clientContents = fs.readFileSync(prismaClientIndex, "utf8");
  if (clientContents.includes('"copyEngine": false')) {
    fs.writeFileSync(
      prismaClientIndex,
      clientContents.replace(
        /"copyEngine":\s*false/,
        '"copyEngine": true'
      )
    );
  }
}
run("npx prisma db push --force-reset --skip-generate");
run("npx vitest run --no-file-parallelism --maxWorkers=1");
