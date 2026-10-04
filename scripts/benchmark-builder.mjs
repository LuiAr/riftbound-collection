import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const temporary = await mkdtemp(join(tmpdir(), "riftbound-benchmark-"));
try {
  const output = join(temporary, "benchmark.mjs");
  await build({ entryPoints: ["scripts/benchmark-builder.ts"], bundle: true, platform: "node", format: "esm", outfile: output, alias: { "cloudflare:workers": "./tests/fixtures/builder-env.ts" } });
  const result = spawnSync(process.execPath, [output, ...process.argv.slice(2)], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally { await rm(temporary, { recursive: true, force: true }); }
