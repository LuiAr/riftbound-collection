import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { env } from "../tests/fixtures/builder-env";
import { benchmarkCases, BENCHMARK_VERSION } from "../lib/deck-benchmark";
import { feasibilityGuidance } from "../lib/strategy-feasibility";
import { builderCards, RULES } from "../lib/deck-builder";
import { evaluateBuild, MODEL, prepareBuild } from "../lib/server-builder";

const flags = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index], value = process.argv[index + 1];
  if (!["--report", "--outputs", "--requests"].includes(flag) || !value || value.startsWith("--")) throw new Error("Usage: benchmark-builder.mjs [--report path.json] [--requests path.json] [--outputs path.json]");
  flags.set(flag, value);
}
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const cases = benchmarkCases();
const snapshotHash = hash({ version: BENCHMARK_VERSION, rules: RULES, cards: builderCards, cases });
const originalFetch = globalThis.fetch;
env.OPENAI_API_KEY = "offline-benchmark-placeholder";
globalThis.fetch = (async (url: string | URL | Request) => {
  if (String(url) !== RULES.source) throw new Error("Benchmark request export cannot make model calls or access user data.");
  return new Response(`<h2>Constructed Format Legality</h2>September 18, 2026<ul>${RULES.bans.map((name) => `<li>${name}</li>`).join("")}</ul><h2>2v2 Constructed Legality</h2><a href="${RULES.core}">Core</a><a href="${RULES.tournament}">Tournament</a>`);
}) as typeof fetch;
const requests: { caseId: string; promptHash: string; reservationSek: number; request: Record<string, unknown> }[] = [];
try {
  for (const value of cases) {
    const prepared = await prepareBuild(value.context.input, value.context.owned, value.context.prices, value.context.fx);
    if (hash(prepared.context.referenceSnapshot) !== hash(value.context.referenceSnapshot)) throw new Error("Current reference selection differs from the frozen benchmark. Version the fixtures before exporting new requests.");
    requests.push({ caseId: value.id, promptHash: hash(JSON.parse(prepared.body)), reservationSek: prepared.reservationOre / 100, request: JSON.parse(prepared.body) });
  }
} finally { globalThis.fetch = originalFetch; delete env.OPENAI_API_KEY; }
if (flags.has("--requests")) writeFileSync(flags.get("--requests")!, JSON.stringify({ benchmarkVersion: BENCHMARK_VERSION, snapshotHash, model: MODEL, syntheticInventoryAndPrices: true, liveRulesVerified: false, requests }, null, 2));

type Sample = { caseId: string; runId: string; model: string; promptHash: string; output?: unknown; error?: string; costSek?: number };
const captured = flags.has("--outputs") ? JSON.parse(readFileSync(flags.get("--outputs")!, "utf8")) : null;
if (captured && (captured.benchmarkVersion !== BENCHMARK_VERSION || captured.snapshotHash !== snapshotHash)) throw new Error("Captured outputs do not match this benchmark version and snapshot. Evaluate each version separately.");
const samples: Sample[] = captured?.samples ?? [];
if (!Array.isArray(samples)) throw new Error("Output file must contain a samples array.");
const seen = new Set<string>();
const measured = samples.map((sample) => {
  const value = cases.find((entry) => entry.id === sample.caseId);
  const request = requests.find((entry) => entry.caseId === sample.caseId);
  if (!value || !request || !sample.runId || !sample.model || sample.promptHash !== request.promptHash || seen.has(`${sample.caseId}/${sample.runId}`)) throw new Error("Unknown case, missing metadata, prompt mismatch or duplicate sample. Do not mix incomparable runs.");
  seen.add(`${sample.caseId}/${sample.runId}`);
  if (sample.error) return { caseId: sample.caseId, runId: sample.runId, model: sample.model, costSek: sample.costSek ?? null, failure: sample.error, acceptedVersions: 0, proposedVersions: 0, correctImpossibleRefusal: false, expectedRefusal: value.scenario === "empty_zero_budget", unexpectedRefusal: false };
  try {
    const result = evaluateBuild({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(sample.output) }] }] }, value.context, 0);
    const output = sample.output as { ownedOnly: unknown; budget: unknown };
    const proposedVersions = Number(Boolean(output.ownedOnly)) + Number(Boolean(output.budget));
    const acceptedVersions = Number(Boolean(result.ownedOnly)) + Number(Boolean(result.budget));
    return { caseId: sample.caseId, runId: sample.runId, model: sample.model, costSek: sample.costSek ?? null, proposedVersions, acceptedVersions, correctImpossibleRefusal: value.scenario === "empty_zero_budget" && proposedVersions === 0 && result.explanation.trim().length > 0, rejected: result.rejected, expectedRefusal: value.scenario === "empty_zero_budget", unexpectedRefusal: value.scenario === "complete" && acceptedVersions < 2, quality: result.quality, humanReview: { winPlan: null, engineAndCombos: null, replacements: null, resourceDemands: null, favouriteRole: null, verdict: null }, output: sample.output };
  } catch (error) { return { caseId: sample.caseId, runId: sample.runId, model: sample.model, costSek: sample.costSek ?? null, failure: error instanceof Error ? error.message : "Unparseable output", acceptedVersions: 0, proposedVersions: 0, correctImpossibleRefusal: false, expectedRefusal: value.scenario === "empty_zero_budget", unexpectedRefusal: false }; }
});
const report = {
  benchmarkVersion: BENCHMARK_VERSION, snapshotHash, generatedAt: new Date().toISOString(), model: MODEL,
  scope: "Offline feasibility and baseline evaluation; optional captured model outputs. No API calls or simulated games are made by this command.",
  fixtures: { champions: 8, scenarios: 6, cases: cases.length, reviewedChampions: 3, unreviewedChampions: 5, prices: "Synthetic, 10 SEK per copy except declared expensive/unknown cases; shipping excluded" },
  baseline: cases.map((value) => ({ caseId: value.id, cohort: value.cohort, note: value.note, referenceId: value.referenceId, ownedOnly: value.baselineFits.ownedOnly, budget: value.baselineFits.budget, feasibility: feasibilityGuidance({ ...value.context.feasibility!, fits: value.context.feasibility!.fits.filter((fit) => fit.referenceId === value.referenceId) }) })),
  samples: measured,
  metrics: { capturedSamples: measured.length, coveredCases: new Set(measured.map((sample) => sample.caseId)).size, proposedVersions: measured.reduce((sum, sample) => sum + sample.proposedVersions, 0), acceptedVersions: measured.reduce((sum, sample) => sum + sample.acceptedVersions, 0), rejectedVersions: measured.reduce((sum, sample) => sum + sample.proposedVersions - sample.acceptedVersions, 0), correctImpossibleRefusals: measured.filter((sample) => sample.correctImpossibleRefusal).length, failedSamples: measured.filter((sample) => "failure" in sample).length, easyCaseFailures: measured.filter((sample) => sample.unexpectedRefusal).length, humanReviewedSamples: 0, simulatedGames: 0 },
  byModel: [...new Set(measured.map((sample) => sample.model))].map((model) => ({ model, samples: measured.filter((sample) => sample.model === model).length, acceptedVersions: measured.filter((sample) => sample.model === model).reduce((sum, sample) => sum + sample.acceptedVersions, 0), failedSamples: measured.filter((sample) => sample.model === model && "failure" in sample).length })),
  limitations: ["Controlled baselines are copied references, not generated AI decks.", "Passing validation or feasibility tests does not establish strategic quality.", "Unknown core roles remain unreviewed; annotations are judgments, not proofs.", "Human rubric fields require independent review; this command does not certify them.", "The benchmark uses frozen local rule/card data, not a live rules verification.", "Captured provider failures must be included. Declared costs are metadata, not independently verified billing."],
};
if (flags.has("--report")) writeFileSync(flags.get("--report")!, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ benchmarkVersion: BENCHMARK_VERSION, snapshotHash, fixtures: report.fixtures, metrics: report.metrics, report: flags.get("--report") ?? null, requests: flags.get("--requests") ?? null }));
