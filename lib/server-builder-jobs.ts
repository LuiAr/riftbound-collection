import { env } from "cloudflare:workers";
import { displayCards } from "./collection";
import { exportDeck, ownedInventory, validateDeck, type BuilderInput } from "./deck-builder";
import { getCollection } from "./server-collection";
import { loadPrices } from "./server-prices";
import { evaluateBuild, loadFx, measuredOre, prepareBuild, responseText, verifyCurrentRules, MONTHLY_CAP_ORE, type BuildContext, type ProviderResponse } from "./server-builder";
import { deckSnapshot, listSavedDecks } from "./server-decks";
import { activeJob, type BuilderJob, type GeneratedDecks } from "./builder-jobs";
import type { BuildStage } from "./builder-progress";

type JobRow = { user_id: string; call_id: string; month: string; reserved_ore: number; actual_ore: number | null; status: string; result_json: string | null; created_at: string; updated_at: string | null; input_json: string | null; context_json: string | null; provider_id: string | null; conversation_id: string | null; raw_output: string | null; error_message: string | null; stage: BuildStage; deleted_at: string | null; kept_deck_id: string | null; lease_until: number };
const now = () => new Date().toISOString();
function db(): D1Database { if (!env.DB) throw new Error("Deck generation storage is unavailable."); return env.DB; }
async function row(userId: string, id: string) { return db().prepare("SELECT * FROM builder_calls WHERE user_id = ? AND call_id = ?").bind(userId, id).first<JobRow>(); }
function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Generation could not be completed.";
  return message.replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]").slice(0, 700);
}
async function event(userId: string, id: string, stage: BuildStage, message: string) {
  const date = now();
  await db().batch([
    db().prepare("UPDATE builder_calls SET stage = ?, updated_at = ? WHERE user_id = ? AND call_id = ?").bind(stage, date, userId, id),
    db().prepare("INSERT INTO builder_events (user_id, call_id, stage, message, created_at) VALUES (?, ?, ?, ?, ?)").bind(userId, id, stage, message.slice(0, 700), date),
  ]);
  console.info(JSON.stringify({ event: "deck_generation", jobId: id, stage, message: message.slice(0, 700) }));
}
async function provider(path: string, method = "GET", body?: unknown) {
  if (!env.OPENAI_API_KEY) throw new Error("The OpenAI API key is not configured.");
  return fetch(`https://api.openai.com/v1/${path}`, { method, headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(method === "POST" ? 7000 : 10000) });
}
function serviceError(raw: ProviderResponse, response: Response) {
  const code = raw.error?.code ?? `http_${response.status}`;
  const message = safeMessage(new Error(raw.error?.message ?? "The AI service could not complete this request."));
  return new Error(`${message} (${code}${response.headers.get("x-request-id") ? `; request ${response.headers.get("x-request-id")}` : ""})`);
}
async function settle(job: JobRow, status: string, actual: number | null, result: GeneratedDecks | null, raw: string | null, error: string | null) {
  const statements: D1PreparedStatement[] = [];
  if (actual !== null) statements.push(db().prepare("UPDATE builder_usage SET reserved_ore = reserved_ore - ?, spent_ore = spent_ore + ? WHERE user_id = ? AND month = ? AND EXISTS (SELECT 1 FROM builder_calls WHERE user_id = ? AND call_id = ? AND actual_ore IS NULL)").bind(job.reserved_ore, actual, job.user_id, job.month, job.user_id, job.call_id));
  statements.push(db().prepare("UPDATE builder_calls SET status = ?, actual_ore = ?, result_json = ?, raw_output = ?, error_message = ?, updated_at = ?, lease_until = 0 WHERE user_id = ? AND call_id = ? AND actual_ore IS NULL").bind(status, actual, result ? JSON.stringify(result) : null, raw, error, now(), job.user_id, job.call_id));
  await db().batch(statements);
}
export async function getBuilderJob(userId: string, id: string): Promise<BuilderJob | null> {
  const job = await row(userId, id);
  if (!job || job.deleted_at) return null;
  const logs = await db().prepare("SELECT stage, message, created_at FROM builder_events WHERE user_id = ? AND call_id = ? ORDER BY id ASC").bind(userId, id).all<{ stage: string; message: string; created_at: string }>();
  const result = job.result_json ? JSON.parse(job.result_json) as GeneratedDecks : null;
  const status = job.status === "completed" && result && !result.ownedOnly && !result.budget ? "no_deck" : job.status;
  return { id, status, stage: job.stage, createdAt: job.created_at, updatedAt: job.updated_at ?? job.created_at, result, error: job.error_message, rawOutput: ["completed", "kept"].includes(status) ? null : job.raw_output, keptDeckId: job.kept_deck_id, logs: logs.results.map((log) => ({ stage: log.stage, message: log.message, createdAt: log.created_at })) };
}
export async function startBuilderJob(userId: string, id: string, input: BuilderInput): Promise<BuilderJob> {
  const old = await row(userId, id);
  if (old) {
    if (old.input_json && old.input_json !== JSON.stringify(input)) throw new Error("This request identifier already belongs to different deck options.");
    const found = await getBuilderJob(userId, id);
    if (!found) throw new Error("This generation was deleted. Start a new generation.");
    return found;
  }
  const month = now().slice(0, 7);
  const inserted = await db().prepare("INSERT OR IGNORE INTO builder_calls (user_id, call_id, month, reserved_ore, status, created_at, updated_at, input_json, stage, lease_until) VALUES (?, ?, ?, 0, 'preparing', ?, ?, ?, 'inventory', ?)").bind(userId, id, month, now(), now(), JSON.stringify(input), Date.now() + 60000).run();
  if (!inserted.meta.changes) return (await getBuilderJob(userId, id))!;
  await prepareJob(userId, id, input);
  return (await getBuilderJob(userId, id))!;
}
async function prepareJob(userId: string, id: string, input: BuilderInput) {
  let reserved = 0;
  let sent = false;
  try {
    await event(userId, id, "inventory", "Loading your collection, prices and SEK exchange rates.");
    const [snapshot, prices, fx] = await Promise.all([getCollection(userId), loadPrices().catch(() => null), loadFx(), verifyCurrentRules()]);
    const owned = ownedInventory(displayCards(snapshot.rows), input.extras);
    if (input.favouriteIds.some((cardId) => !owned[cardId])) throw new Error("Confirm that you own your favourite cards before generating.");
    await event(userId, id, "references", "Checking current rules and preparing compatible reference strategies.");
    const prepared = await prepareBuild(input, owned, prices, fx);
    await event(userId, id, "references", `Compared ${new Set(prepared.context.feasibility?.fits.map((fit) => fit.strategy)).size} strategies using owned copies, reviewed core quantities and missing-copy costs. Unreviewed strategies remain available for AI assessment.`);
    const context = JSON.stringify(prepared.context);
    if (new TextEncoder().encode(context).length > 900000) throw new Error("This generation snapshot is too large to store safely.");
    await db().prepare("UPDATE builder_calls SET context_json = ? WHERE user_id = ? AND call_id = ?").bind(context, userId, id).run();
    const month = (await row(userId, id))!.month;
    await db().prepare("INSERT OR IGNORE INTO builder_usage (user_id, month, reserved_ore, spent_ore) VALUES (?, ?, 0, 0)").bind(userId, month).run();
    const reservation = await db().batch([
      db().prepare("UPDATE builder_calls SET reserved_ore = ? WHERE user_id = ? AND call_id = ? AND reserved_ore = 0 AND actual_ore IS NULL AND EXISTS (SELECT 1 FROM builder_usage WHERE user_id = ? AND month = ? AND reserved_ore + spent_ore + ? <= ?)").bind(prepared.reservationOre, userId, id, userId, month, prepared.reservationOre, MONTHLY_CAP_ORE),
      db().prepare("UPDATE builder_usage SET reserved_ore = reserved_ore + ? WHERE user_id = ? AND month = ? AND EXISTS (SELECT 1 FROM builder_calls WHERE user_id = ? AND call_id = ? AND reserved_ore = ? AND actual_ore IS NULL)").bind(prepared.reservationOre, userId, month, userId, id, prepared.reservationOre),
    ]);
    if (!reservation[0].meta.changes) throw new Error("The monthly AI allowance is spent or reserved by another generation.");
    reserved = prepared.reservationOre;
    const conversationResponse = await provider("conversations", "POST", { metadata: { deck_job: id } });
    const conversation = await conversationResponse.json() as { id?: string; error?: { code?: string; message?: string } };
    if (!conversationResponse.ok || !conversation.id) throw serviceError(conversation, conversationResponse);
    await db().prepare("UPDATE builder_calls SET conversation_id = ?, status = 'submitting' WHERE user_id = ? AND call_id = ?").bind(conversation.id, userId, id).run();
    await event(userId, id, "build", "Submitting a background AI request. The output will be retained even when you leave.");
    sent = true;
    const response = await provider("responses", "POST", { ...JSON.parse(prepared.body), conversation: conversation.id, background: true, store: true });
    const raw = await response.json() as ProviderResponse;
    if (!response.ok) {
      sent = false;
      throw serviceError(raw, response);
    }
    if (!raw.id) throw new Error("The AI accepted the request without a retrievable response ID. Usage is reserved for review.");
    await db().prepare("UPDATE builder_calls SET provider_id = ?, status = ?, lease_until = 0, updated_at = ? WHERE user_id = ? AND call_id = ?").bind(raw.id, ["queued", "in_progress"].includes(raw.status ?? "") ? raw.status! : "in_progress", now(), userId, id).run();
    await event(userId, id, "build", `AI request accepted (${raw.id}). You can close this page.`);
    if (!["queued", "in_progress"].includes(raw.status ?? "")) await finishJob((await row(userId, id))!, raw);
  } catch (error) {
    const job = await row(userId, id);
    if (!job) throw error;
    if (reserved && !job.reserved_ore) job.reserved_ore = reserved;
    const message = safeMessage(error);
    await settle(job, sent ? job.conversation_id ? "in_progress" : "uncertain" : "failed", sent ? null : 0, null, null, message);
    await event(userId, id, job.stage, message);
  }
}
async function finishJob(job: JobRow, raw: ProviderResponse, recovered = false) {
  const context = JSON.parse(job.context_json!) as BuildContext;
  const actual = recovered ? job.reserved_ore : measuredOre(raw, context.fx);
  const output = responseText(raw).slice(0, 250000);
  if (actual === null || actual > job.reserved_ore) {
    await settle(job, "uncertain", null, null, output, "AI output was retained, but its billed usage could not be confirmed. The allowance stays reserved.");
    await event(job.user_id, job.call_id, "validate", "Output retained; usage needs review.");
    return;
  }
  if (raw.status !== "completed") {
    const message = raw.status === "incomplete" ? `The AI stopped before completing its output (${raw.incomplete_details?.reason ?? "incomplete"}).` : safeMessage(new Error(raw.error?.message ?? `AI request ended with status ${raw.status ?? "unknown"}.`));
    await settle(job, "failed", actual, null, output, message);
    await event(job.user_id, job.call_id, "build", message);
    return;
  }
  await db().prepare("UPDATE builder_calls SET status = 'validating', raw_output = ? WHERE user_id = ? AND call_id = ? AND actual_ore IS NULL").bind(output, job.user_id, job.call_id).run();
  await event(job.user_id, job.call_id, "validate", "AI output received. Checking legality, card quantities, favourites and budget.");
  try {
    await verifyCurrentRules();
    const result = { ...evaluateBuild(raw, context, actual), ...(recovered ? { costEstimated: true } : {}) };
    const accepted = Boolean(result.ownedOnly || result.budget);
    await settle(job, accepted ? "completed" : "no_deck", actual, result, output, accepted ? null : result.explanation || "No proposed deck passed validation.");
    await event(job.user_id, job.call_id, "validate", accepted ? "Validated result saved to your generation inbox." : `Output retained for review. ${result.rejected.join(" ") || result.explanation}`);
  } catch (error) {
    const message = safeMessage(error);
    await settle(job, "failed", actual, null, output, message);
    await event(job.user_id, job.call_id, "validate", `Output retained. ${message}`);
  }
}
async function recoverConversation(job: JobRow) {
  const response = await provider(`conversations/${encodeURIComponent(job.conversation_id!)}/items?limit=100&order=desc`);
  const items = await response.json() as { data?: (NonNullable<ProviderResponse["output"]>[number] & { status?: string })[] };
  if (!response.ok) throw new Error("Retained AI output could not be loaded. Try refreshing later.");
  const text = responseText({ output: items.data?.filter((item) => item.role === "assistant" && (!item.status || item.status === "completed")) });
  if (!text) return false;
  await finishJob(job, { status: "completed", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] }, true);
  await event(job.user_id, job.call_id, "validate", "Recovered retained conversation output. Exact usage is unavailable; the original reservation is counted as a conservative cost estimate.");
  return true;
}
export async function refreshBuilderJob(userId: string, id: string): Promise<BuilderJob | null> {
  const job = await row(userId, id);
  if (!job || job.deleted_at) return null;
  if (job.status === "running" && !job.provider_id && !job.context_json) {
    await settle(job, "uncertain", null, null, null, "This older browser-bound request was interrupted and has no retained provider response. Its usage remains reserved for review. New generations run in the background.");
    await event(userId, id, "build", "Older interrupted request retained for review. New requests use background generation.");
    return getBuilderJob(userId, id);
  }
  if ((job.provider_id || job.conversation_id) && job.context_json && ["queued", "in_progress", "validating"].includes(job.status)) {
    const lease = await db().prepare("UPDATE builder_calls SET lease_until = ? WHERE user_id = ? AND call_id = ? AND lease_until < ? AND actual_ore IS NULL").bind(Date.now() + 30000, userId, id, Date.now()).run();
    if (lease.meta.changes) {
      try {
        if (!job.provider_id) {
          const recovered = await recoverConversation(job);
          if (!recovered && Date.now() - Date.parse(job.created_at) > 20 * 60000) await settle(job, "uncertain", null, null, null, "No completed output was found after an interrupted submission. Usage stays reserved for review.");
          else if (!recovered) await db().prepare("UPDATE builder_calls SET lease_until = 0 WHERE user_id = ? AND call_id = ?").bind(userId, id).run();
          return getBuilderJob(userId, id);
        }
        const response = await provider(`responses/${encodeURIComponent(job.provider_id)}`);
        const raw = await response.json() as ProviderResponse;
        if (response.status === 404 && job.conversation_id) {
          if (!await recoverConversation(job)) {
            if (Date.now() - Date.parse(job.created_at) > 20 * 60000) {
              await settle(job, "uncertain", null, null, null, "The response is unavailable and no completed conversation output was found. Usage stays reserved for review.");
              await event(userId, id, "build", "No retained output was found. Usage needs review.");
            } else throw new Error("No completed AI output was found yet. Checking the retained conversation again shortly.");
          }
        } else if (!response.ok) throw serviceError(raw, response);
        else if (["queued", "in_progress"].includes(raw.status ?? "")) await db().prepare("UPDATE builder_calls SET status = ?, lease_until = 0, error_message = NULL WHERE user_id = ? AND call_id = ?").bind(raw.status!, userId, id).run();
        else await finishJob(job, raw);
      } catch (error) {
        const message = safeMessage(error);
        await db().prepare("UPDATE builder_calls SET lease_until = 0, error_message = ? WHERE user_id = ? AND call_id = ?").bind(message, userId, id).run();
        console.error(JSON.stringify({ event: "deck_poll_failed", jobId: id, message }));
      }
    }
  } else if (["preparing", "submitting"].includes(job.status) && job.lease_until < Date.now()) {
    const submitted = job.status === "submitting";
    const status = submitted ? job.conversation_id ? "in_progress" : "uncertain" : "failed";
    const message = submitted ? "Submission was interrupted before its response ID was saved. Checking retained output; usage stays reserved." : "Preparation was interrupted. This request can be deleted and generated again.";
    await settle(job, status, submitted ? null : 0, null, null, message);
    await event(userId, id, job.stage, message);
  }
  return getBuilderJob(userId, id);
}
export async function listBuilderJobs(userId: string, before?: string) {
  const active = await db().prepare("SELECT call_id FROM builder_calls WHERE user_id = ? AND deleted_at IS NULL AND status IN ('queued','in_progress','validating','preparing','submitting','running') ORDER BY created_at DESC LIMIT 3").bind(userId).all<{ call_id: string }>();
  await Promise.all(active.results.map((job) => refreshBuilderJob(userId, job.call_id)));
  const results = await db().prepare("SELECT call_id FROM builder_calls WHERE user_id = ? AND deleted_at IS NULL AND status != 'kept' AND (? IS NULL OR created_at || '|' || call_id < ?) ORDER BY created_at DESC, call_id DESC LIMIT 31").bind(userId, before ?? null, before ?? null).all<{ call_id: string }>();
  const jobs = (await Promise.all(results.results.slice(0, 30).map((job) => getBuilderJob(userId, job.call_id)))).filter((job): job is BuilderJob => job !== null);
  const last = jobs.at(-1);
  return { jobs, nextCursor: results.results.length > 30 && last ? `${last.createdAt}|${last.id}` : null };
}
export async function keepBuilderJob(userId: string, id: string, version: "ownedOnly" | "budget", name: string) {
  const job = await getBuilderJob(userId, id);
  const deck = job?.result?.[version];
  if (!job || !deck || !["completed", "kept"].includes(job.status)) throw new Error("This generation has no validated deck to keep.");
  if (validateDeck(deck.entries).length) throw new Error("This deck needs a rules review before it can be kept.");
  const deckId = job.keptDeckId ?? `${id}-${version}`;
  const date = now();
  await db().batch([
    db().prepare("INSERT OR IGNORE INTO saved_decks (user_id, deck_id, name, deck_text, hide_runes, hide_tokens, created_at, updated_at) SELECT ?, ?, ?, ?, 0, 0, ?, ? WHERE (SELECT COUNT(*) FROM saved_decks WHERE user_id = ?) < 30").bind(userId, deckId, name, exportDeck(deck), date, date, userId),
    db().prepare("INSERT OR IGNORE INTO deck_versions (user_id, deck_id, version_id, name, deck_text, snapshot_json, created_at) SELECT user_id, deck_id, ?, name, deck_text, ?, created_at FROM saved_decks WHERE user_id = ? AND deck_id = ?").bind(deckId, JSON.stringify(deckSnapshot(name, exportDeck(deck))), userId, deckId),
    db().prepare("UPDATE builder_calls SET kept_deck_id = ?, status = 'kept', updated_at = ? WHERE user_id = ? AND call_id = ? AND EXISTS (SELECT 1 FROM saved_decks WHERE user_id = ? AND deck_id = ?)").bind(deckId, date, userId, id, userId, deckId),
  ]);
  const saved = (await listSavedDecks(userId)).find((item) => item.deckId === deckId);
  if (!saved) throw new Error("You can save up to 30 decks. Delete one before keeping another.");
  return saved;
}
export async function deleteBuilderJob(userId: string, id: string) {
  const job = await row(userId, id);
  if (!job) return false;
  if (activeJob(job)) throw new Error("Wait for this generation to finish before deleting it.");
  if (job.conversation_id) {
    const itemsResponse = await provider(`conversations/${encodeURIComponent(job.conversation_id)}/items?limit=100`);
    if (itemsResponse.ok) {
      const items = await itemsResponse.json() as { data: { id: string }[]; has_more?: boolean };
      if (items.has_more) throw new Error("The retained output is too large to remove in one pass.");
      for (const item of items.data) {
        const deleted = await provider(`conversations/${encodeURIComponent(job.conversation_id)}/items/${encodeURIComponent(item.id)}`, "DELETE");
        if (!deleted.ok && deleted.status !== 404) throw new Error("The retained AI output could not be deleted. Try again.");
      }
    } else if (itemsResponse.status !== 404) throw new Error("The retained AI output could not be checked before deletion.");
    const deleted = await provider(`conversations/${encodeURIComponent(job.conversation_id)}`, "DELETE");
    if (!deleted.ok && deleted.status !== 404) throw new Error("The retained conversation could not be deleted. Try again.");
  }
  if (job.provider_id) {
    const deleted = await provider(`responses/${encodeURIComponent(job.provider_id)}`, "DELETE");
    if (!deleted.ok && deleted.status !== 404) throw new Error("The retained response could not be deleted. Try again.");
  }
  await db().batch([
    db().prepare("UPDATE builder_calls SET deleted_at = ?, result_json = NULL, raw_output = NULL, input_json = NULL, context_json = NULL, provider_id = NULL, conversation_id = NULL WHERE user_id = ? AND call_id = ?").bind(now(), userId, id),
    db().prepare("DELETE FROM builder_events WHERE user_id = ? AND call_id = ?").bind(userId, id),
  ]);
  return true;
}
