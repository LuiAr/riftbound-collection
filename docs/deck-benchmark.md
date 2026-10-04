# Repeatable deck-builder benchmark

The feasibility stage compares actual reference packages before the model builds a deck. It separates full-reference affordability, reviewed core quantities, optimistic single-copy floors and unknown core roles. An affordable package is a starting point, not a strength rating or a guarantee that the remaining deck fits.

## Frozen cases

Version `deck-benchmark-v1` contains eight champions and six collection/budget scenarios, for 48 cases. Reference anchors and a dated selection epoch are fixed in `tests/fixtures/deck-benchmark.json`.

Akali, Diana and Irelia have reviewed engine annotations. Rengar, Azir, Ornn, Kennen and Ezreal exercise strategies outside those annotations. They are unreviewed controls, not evidence that a model has never encountered these champions during training.

Scenarios:

1. Exact reference ownership: both versions are possible without purchases.
2. One reference copy missing: a 10 SEK purchase exactly fits the budget; an owned-only version needs a substitution. For unreviewed strategies, whether that slot is flexible remains a review question.
3. Expensive reference/engine card: each missing copy costs 1001 SEK against a 1000 SEK budget. For reviewed cores, consider another strategy or a refusal. For unreviewed cores, do not assume the selected card is essential.
4. Unknown price: a missing reference card cannot be bought under a confirmed budget; a priced replacement may be possible.
5. No confirmed cards and zero budget: both versions must be refused.
6. Fun favourite: an owned, compatible unit absent from the anchor reference must be included with a meaningful role. Its compatibility alone does not establish synergy.

Prices are synthetic. Shipping is excluded. Inventories are synthetic exact counts, not the owner's collection. A cryptographic snapshot hash identifies the rules, cards, references, inventories, prices and feasibility calculations used. Changing those inputs requires comparing separately labelled reports. Update the benchmark version when intentionally changing fixtures.

## Run without paying for AI

From the repository:

```sh
node scripts/test-builder.mjs
node scripts/benchmark-builder.mjs --report /absolute/path/baseline.json
```

The first command checks construction and package arithmetic against hand-calculated expectations and runs 48 controlled baseline cases. The second creates a report. `docs/deck-benchmark-baseline.json` records the initial baseline. A baseline is an unmodified reference, not an AI recommendation.

No API key, paid calls, real user data or gameplay simulator is used. Official rules fetching is mocked for prompt construction; the report explicitly says that live rules were not verified. Production generation retains its real fail-closed rules check.

## Evaluate actual generated outputs later

Export the exact requests:

```sh
node scripts/benchmark-builder.mjs --requests /absolute/path/requests.json
```

The exporter checks that today's reference selection still matches the frozen snapshot. If it does not, stop and version the fixtures rather than silently changing the comparison. Each exported request has its own `promptHash`. Requests contain synthetic holdings and prices, no credentials. Exporting them does not submit them.

Run an initial pilot of 12 cases: complete ownership, expensive engine/reference card, unknown price and fun favourite for Akali, Diana and Irelia. Keep all successes, refusals, incomplete responses and service failures. Before any paid batch, verify current official rules and provider pricing, retain the normal spending limits, and use an explicit total cost ceiling. The exported reservation is an estimate, not verified current pricing. Do not submit all 48 requests automatically.

For a broader comparison, repeat each of the 48 cases three times with the same inputs. Pair old and new generator runs by case; label each model and prompt separately. Do not invent a random seed for a provider that does not expose one.

Capture results as a JSON object containing `benchmarkVersion`, `snapshotHash` and `samples`. Each sample requires:

- `caseId`: exact exported case ID.
- `runId`: unique repetition ID within that case.
- `model`: actual reported model.
- `promptHash`: hash from its exported request.
- `output`: the parsed object containing `ownedOnly`, `budget` and `explanation`, or `error` for an interrupted/service failure.
- `costSek`: optional measured cost; missing costs remain unknown. Metadata is not independently verified billing.

Never drop failed requests from the capture file. If the output cannot be parsed, capture the parse failure as `error` and retain the original response in the private evaluation record.

```sh
node scripts/benchmark-builder.mjs --outputs /absolute/path/captured.json --report /absolute/path/evaluation.json
```

The evaluator rejects mismatched snapshots, prompt hashes and duplicate sample IDs. It reports accepted/rejected proposals, service/parse failures, easy-case failures, correct impossible-case refusals, coverage, engine access and quantity reductions, plus the complete supplied outputs. A version rejected by the validator is a rejected proposal, not a successful model refusal. Metrics are also separated by reported model. A missing version is not automatically a failure in difficult cases.

## Independent strategic review

Shuffle and anonymize lists before comparing old and new versions. Have a knowledgeable player review:

| Criterion | What to inspect |
| --- | --- |
| Win plan | How the deck scores, establishes pressure and closes the game |
| Engine and combos | Required packages, copies, enablers and sequencing |
| Replacements | Whether the same role remains supported and compromises are acknowledged |
| Resource demands | Deployment costs, curve, domain requirements and early plays |
| Recovery | Interaction, protection and recovery after disruption |
| Fun favourite | Whether the favourite has a meaningful role rather than being filler |

Use `pass`, `concern`, or `fail` for each criterion, with a concrete reason and reviewer confidence. Record reviewer disagreements. The report includes blank human-review fields; the evaluator does not fill or certify them. Inspect all expensive-core cases and a balanced sample of the remaining cases. Playtests against fixed opponents are a separate evidence stage.

## Gates for improvement

- No accepted illegal decks, false owned-only claims, unknown-price purchases or budget overruns.
- Complete ownership should reliably produce coherent proposals; count refusals and service failures separately.
- Zero-budget empty collections must receive explicit refusals, never invented holdings.
- Reviewed engine removals must be rejected; reduced redundancy must be visible and independently assessed.
- Fun favourites must be included, then reviewed for a meaningful role.
- Improvements require better paired results on unchanged fixtures, not only more accepted lists.

Passing these checks establishes narrower reliability claims. Competitive strength still requires experienced-player review and relevant play results. No predicted tournament win rate follows from this benchmark.

## Live pilot

See [the dated review](deck-benchmark-live-review-2026-10-04.md) for the twelve captured requests, eighteen validated lists, annotation-dependent refusals and limitations. These are genuine AI outputs using synthetic inventories and prices, separate from the controlled baseline. No independent human ratings or simulated games are claimed.
