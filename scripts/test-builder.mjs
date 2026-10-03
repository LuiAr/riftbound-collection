import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const temporary = await mkdtemp(join(tmpdir(), "riftbound-builder-"));
try {
  const output = join(temporary, "tests.cjs");
  await build({ entryPoints: ["scripts/test-deck-builder.ts"], bundle: true, platform: "node", outfile: output });
  let result = spawnSync(process.execPath, [output], { stdio: "inherit" });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  const serverOutput = join(temporary, "server-tests.mjs");
  await build({ entryPoints: ["scripts/test-builder-server.ts"], bundle: true, platform: "node", format: "esm", outfile: serverOutput, alias: { "cloudflare:workers": "./tests/fixtures/builder-env.ts" } });
  result = spawnSync(process.execPath, [serverOutput], { stdio: "inherit" });
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} finally { await rm(temporary, { recursive: true, force: true }); }
