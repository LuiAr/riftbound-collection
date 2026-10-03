import type { BuildStage } from "./builder-progress";
import type { BuilderInput, DeckProposal, FxSnapshot } from "./deck-builder";

export type GeneratedDecks = { ownedOnly: DeckProposal | null; budget: DeckProposal | null; explanation: string; rejected: string[]; input: BuilderInput; rulesCheckedAt: string; pricesAt: string | null; fx: FxSnapshot; costSek: number; costEstimated?: boolean; model: string; createdAt: string };
export type BuilderJob = { id: string; status: string; stage: BuildStage; createdAt: string; updatedAt: string; result: GeneratedDecks | null; error: string | null; rawOutput: string | null; keptDeckId: string | null; logs: { stage: string; message: string; createdAt: string }[] };
export const activeJob = (job: Pick<BuilderJob, "status">) => ["preparing", "submitting", "queued", "in_progress", "validating"].includes(job.status);
