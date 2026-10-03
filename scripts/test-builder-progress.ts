import assert from "node:assert/strict";
import { readBuilderStream, type BuildStage } from "../lib/builder-progress";
import { builderStream } from "../lib/server-builder-stream";

async function main() {
  const stages: BuildStage[] = [];
  let release!: () => void;
  const provider = new Promise<void>((resolve) => { release = resolve; });
  const response = builderStream(async (progress) => {
    progress("inventory"); progress("references"); progress("build");
    await provider;
    progress("validate");
    return { name: "Diana · över-numbered" };
  });
  const result = readBuilderStream<{ name: string }>(response, (stage) => stages.push(stage));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(stages, ["inventory", "references", "build"], "Final checks must wait for the actual provider result.");
  release();
  assert.equal((await result).name, "Diana · över-numbered");
  assert.deepEqual(stages, ["inventory", "references", "build", "validate"]);
  assert.equal(response.headers.get("cache-control"), "private, no-store, no-transform");
  await assert.rejects(readBuilderStream(builderStream(async (progress) => { progress("build"); throw new Error("Provider unavailable"); }), () => {}), /Provider unavailable/);
  const text = `${JSON.stringify({ type: "progress", stage: "build" })}\n${JSON.stringify({ type: "heartbeat" })}\n${JSON.stringify({ type: "result", result: { name: "ö · Diana" } })}\n`;
  const bytes = new TextEncoder().encode(text);
  const fragmented = new Response(new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close(); } }), { headers: { "content-type": "application/x-ndjson" } });
  assert.deepEqual(await readBuilderStream(fragmented, () => {}), { name: "ö · Diana" });
  await assert.rejects(readBuilderStream(new Response('{"type":"progress","stage":"build"}\n', { headers: { "content-type": "application/x-ndjson" } }), () => {}), /before the deck arrived/);
  await assert.rejects(readBuilderStream(Response.json({ error: "Sign in required" }, { status: 401 }), () => {}), /Sign in required/);
  assert.deepEqual(await readBuilderStream(Response.json({ name: "Legacy JSON response" }), () => {}), { name: "Legacy JSON response" });
  console.log("Progress checks passed: real stage order, provider waiting, streamed errors, fragmented UTF-8, interrupted connections and JSON compatibility.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
