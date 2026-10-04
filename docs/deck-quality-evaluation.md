# Evaluating deck recommendations

Reference coverage and construction validation are prerequisites. They do not attest that AI recommendations are competitive.

## Current implementation

- 54 distinct complete references for 34 Legends, including eight official Los Angeles finalists. Source aliases preserve provenance without counting duplicate uploads as independent evidence.
- Current-era reference selection, official versus reported versus community evidence, overall placement, separate strategy profiles and explicit sparse-coverage warnings.
- Deterministic construction, inventory and missing-copy purchase checks. Unknown purchase prices cannot establish a valid budget.
- Exact access to reviewed engine cards or Signatures in eight raw draws, early-unit access and printed Energy distributions. The 39-card shuffled main excludes the chosen champion. No mulligan, tutor, additional draw, resource availability or opponent is modelled.
- A reference and quality snapshot for new background generations. Existing saved deck exports and old generation contexts remain supported.

The offline checks prepare requests and accept/reject controlled outputs for every supported Legend. Additional fixtures cover Rengar, Azir, Ornn, Kennen and Ezreal, outside the three Legends used to develop engine annotations. Synthetic prices exercise arithmetic only. No new paid model requests or games are part of this suite.

## Strategy feasibility and fixed benchmark

Generation now receives a deterministic comparison of full reference costs, reviewed core quantities and optimistic minimum packages before choosing a strategy. Snapshot costs use confirmed missing copies only and cannot establish gameplay strength.

See [the fixed benchmark protocol](deck-benchmark.md) for 48 cases across eight champions, request export, captured-model-output evaluation and independent player review. [The initial baseline](deck-benchmark-baseline.json) uses unmodified references and contains no captured model samples or games.

## What would attest quality across Legends?

1. Freeze model, prompt, card/rule version, reference set and evaluator before measuring. Keep some Legends and event lists separate from development. Our five regression fixtures are held out from engine annotation development, not from a scientifically controlled model-training process.
2. Generate repeated outputs for several strategies with different inventories and budgets. Include complete ownership, an intact engine with missing flexible slots, missing expensive engine cards and a genuinely insufficient budget. Record refusals and failures, not only successful decks. Use the same confirmed inventory for paired comparisons. Do not quietly add unconfirmed cards.
3. Compare against an event list, a simple affordable-reference baseline and the current generator. Keep an event list separate from prompt references when testing generalization to a new list. A match percentage is descriptive, not the quality objective.
4. Have a knowledgeable reviewer assess the scoring plan, enablers, combos, deployment, protection, movement, resource demands, disruption recovery and sideboard plan. Hide which system created each list where practical. Record disagreements and confidence instead of letting a second AI certify the first AI.
5. Play repeated games against fixed contemporary opponents, with balanced first/second positions, sideboarding and comparable pilots. Record matchup, pilot, result, mulligan, dead hands and engine failures. Report uncertainty and distinguish pilot learning from a deck change. One tournament finish and a small local sample cannot establish a reliable predicted win rate.

Technical acceptance requires zero accepted illegal decks, false owned-only claims, unpriced purchases or budget overruns. Strategic acceptance requires no unexplained loss of reviewed engine cards and a workable scoring plan. Competitive evidence remains a separate status until real game results support it.

## Simulation progression

Start with deterministic access calculations, then add explicit mulligan policies and a validated resource/sequencing engine. Search only declared flexible slots within one strategy; check complete package cost from missing copies. Preserve candidates that improve a measured property without an unacceptable cost or strategic sacrifice. Use paired random draws and fixed seeds, and keep unseen scenarios for evaluation.

Goldfish sequencing tests measure unopposed execution. Full opponent simulation requires accurately implemented card effects, priority/reactions, combat, movement, battlefields, scoring and hidden information. Test the rules engine against manual examples and replays. Matchup bot results are specific to their policies until calibrated against human playtests. Do not infer competitive win rates from raw draw access, goldfish speed or self-play alone.

## Reproduce regression checks

Run `node scripts/test-builder.mjs` from the repository. Set `BUILDER_EVALUATION_OUTPUT` to an absolute file path for a JSON summary of the five additional-Legend fixtures. Run TypeScript checking and the Sites build before deployment. Paid model benchmarking must retain the normal spending limits and clearly record actual usage.
