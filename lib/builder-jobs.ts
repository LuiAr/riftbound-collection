import type { BuildStage } from "./builder-progress";
import type { BuilderInput, DeckProposal, FxSnapshot } from "./deck-builder";
import type { qualityChecks } from "./deck-quality";

export type GeneratedDecks = { analysis?: { ownedOnly: import("./deck-advisor").StrategyAnalysis | null; budget: import("./deck-advisor").StrategyAnalysis | null }; recommendation?: "ownedOnly" | "budget" | null; rankingMethod?: string; feasibility?: import("./strategy-feasibility").StrategyFeasibility; ownedOnly: DeckProposal | null; budget: DeckProposal | null; quality?: { ownedOnly: ReturnType<typeof qualityChecks> | null; budget: ReturnType<typeof qualityChecks> | null }; explanation: string; rejected: string[]; input: BuilderInput; rulesCheckedAt: string; pricesAt: string | null; fx: FxSnapshot; costSek: number; costEstimated?: boolean; model: string; createdAt: string };
export type BuilderJob = { id: string; status: string; stage: BuildStage; createdAt: string; updatedAt: string; result: GeneratedDecks | null; error: string | null; rawOutput: string | null; keptDeckId: string | null; logs: { stage: string; message: string; createdAt: string }[] };
export const activeJob = (job: Pick<BuilderJob, "status">) => ["preparing", "submitting", "queued", "in_progress", "validating"].includes(job.status);
