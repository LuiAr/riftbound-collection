# Deck adviser verification, October 7, 2026

The five implementation steps are covered by a shared analyzer, free collection search, budgeted packages with comparisons, on-demand release review, persistent deck versions and analyzer-based ranking of accepted AI proposals. The source bank grew from 54 to 57 legal lists for 34 Legends. Three new lists come from Riftbound France's reported Diana, Irelia and Vi event pages. Reported placements remain separate from official results. The October 6 gallery feed was audited, 103 card-property or rarity records were enriched/corrected, and incomplete equipment panels remain explicitly flagged.

The evaluation used the owner's actual active September 30 inventory, version 2, containing 268 printing rows, and public sources captured on October 7. The price guide is dated October 7 and FX October 6. The downloadable Riot rules page confirmed all 12 existing Standard bans. No inventory was modified. The JSON companion records the inventory hash, exact returned lists, comparisons, source dates and results; raw current inventory rows are not committed again.

| Real inventory case | Purchase ceiling | Returned candidates | First candidate completion estimate | Reviewed engine gap |
|---|---:|---:|---:|---|
| Akali | 1,000 SEK | 5 | 938.24 SEK | 0 copies |
| Diana | 250 SEK | 5 | 231.22 SEK | 1 copy |
| Diana | 1,000 SEK | 5 | 680.38 SEK | 0 copies |
| Irelia | 250 SEK | 5 | 250.00 SEK | 2 copies |
| Irelia | 1,000 SEK | 5 | 767.87 SEK | 0 copies |
| Kennen | 250 SEK | 3 | 47.41 SEK | Engine not reviewed |
| Shen | 250 SEK | 3 | 125.81 SEK | Engine not reviewed |

All returned lists passed the Standard validator and confirmed whole-deck missing-copy purchase ceiling. These are estimates using recent sale averages, not seller offers; shipping is excluded. The five Legends were each evaluated at 0, 250 and 1,000 SEK. The zero-budget cases correctly returned no complete deck: the inventory records only 11 runes globally and fewer than 12 in each compatible domain pair. This is a constraint failure, not evidence of an optimizer finding every possible deck. Temporary counts can include unrecorded runes without writing inventory.

The real 231.22 SEK Diana draft was then analyzed and upgraded under a 1,000 SEK ceiling. A 630.69 SEK completion package restored the missing reviewed engine copy, reduced role deviation from 12 to 4 and Energy deviation from 6 to 2. It also reduced card-access, recovery and resource-support counts; those trade-offs are exposed. A cheaper 232.24 SEK package improved smaller measured gaps but did not restore the engine. The estimates cover owning the entire resulting deck, not extra spend on top of owning the draft. Neither package is established as competitively stronger.

The whole-collection endpoint returned five different owned Legends after ranking and diversification. Exact results are in the JSON companion. Each selected Legend retains its own strategy baseline, with reviewed engine preservation prioritized and uncertainty attached to unreviewed engines.

The live-source release replay found 21 compatible Radiance previews for the Akali example. All remain labelled preview-only and outside deck construction. Four incomplete reveal records lacked domain identity and were excluded. New and changed cards are presented for review with official gallery links and full supplied text. This feature checks on demand; it does not run on a schedule. It also does not automatically activate an unreviewed card feed. A reviewed catalog update is required before cards from future releases participate in priced upgrade packages.

Storage verification applied all actual Drizzle migrations to SQLite, saved the real Akali list, edited it, and confirmed two independent versions with the original text preserved. Cross-account reads, updates and deletion were denied. Explicit owner deletion removed both the deck and its versions. Authenticated API tests used the captured current inventory and checked analysis, release review, whole-collection search, unauthenticated rejection and cross-origin write rejection. Builder regression tests also verified idempotent version creation when keeping a generation.

Controlled cases separately verified engine restoration with fully supplied synthetic holdings, ranking an intact real engine above a deliberately degraded real list, strict rejection of unknown purchase prices, malformed-feed rejection and round trips for all 57 published lists. These controlled holdings are not presented as the owner's inventory. No paid AI calls, gameplay simulations or independent player reviews were run for this update. The tests establish functional correctness and measured strategy fit; they do not establish win rates or competitive superiority.

The original builder suite, the adviser replay, TypeScript and the production Sites build are required checks. New adviser and persistence files pass targeted lint. Existing builder effects retain their prior lint findings. Browser interaction testing was unavailable in this environment, so API/storage verification and build checks are the evidence for this update.

To replay the public captures with the original owner-supplied inventory:

```sh
node scripts/test-adviser.mjs
node scripts/test-builder.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

To reproduce the version 2 results, set `ADVISER_INVENTORY_PATH` to that import's JSON with `rows`, `headers`, `version` and `sourceName`; optionally set `ADVISER_REPORT_PATH` for a new report. The replay clock is pinned to October 7 so captured prices remain reproducible. Production still rejects prices older than three days and FX older than seven days.
