import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const dir = await mkdtemp(join(tmpdir(), "riftbound-adviser-"));
try {
  const output = join(dir, "test.mjs");
  await build({ entryPoints: ["scripts/test-adviser.ts"], bundle: true, platform: "node", format: "esm", outfile: output, alias: { "cloudflare:workers": "./tests/fixtures/builder-env.ts" }, plugins: [{ name: "fixture-auth", setup(b) { b.onResolve({ filter: /chatgpt-auth$/ }, () => ({ path: resolve("tests/fixtures/advisor-auth.ts") })); } }] });
  const result = spawnSync(process.execPath, [output], { stdio: "inherit", env: process.env });
  process.exitCode = result.status ?? 1;
} finally { await rm(dir, { recursive: true, force: true }); }
