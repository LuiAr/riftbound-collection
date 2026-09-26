# Riftbound Collection Site

This directory is the source checkout for the private Sites app identified by `.openai/hosting.json`. Follow the parent project's `AGENTS.md` and the Sites building and hosting skills before changing or publishing it.

The private GitHub repository at `https://github.com/LuiAr/riftbound-collection` mirrors this source. The local `github` remote points there; Sites deployment still uses its own source repository and workflow. After a website change is published through Sites, push the same commit to `github` so both sources stay aligned. A GitHub push alone does not deploy the Site. Keep the GitHub repository private because `data/initial-inventory.json` contains the owner's supplied collection export.

## Architecture

- Vinext renders the collection at `/` and uses dispatch-owned Sign in with ChatGPT. The authenticated Site user ID scopes every collection read and write.
- D1 holds versioned Card Nexus inventory snapshots. `collection_meta.active_import_id` selects the current snapshot; imports stage rows before switching that pointer, so a failed upload cannot clear the previous collection. `collection_imports` stores each import's date, filename, headers, and version. Keep historical rows when saving a new import. A read of an existing Site records its previously active import in `collection_imports` without rewriting that inventory. Historical browsing is read-only; exports and new imports use the latest snapshot.
- `data/initial-inventory.json` contains the user's supplied 2026-09-24 export. Only the first authenticated owner of this private Site is seeded with it. Do not put it in public assets or expose it through an unauthenticated route.
- `data/catalog.json` is a compact snapshot of [riftbound-cards](https://github.com/LouisCourrian/riftbound-cards) release `v2026-09-23`; names, rarity, and Riot CDN image URLs originate from Riot's card gallery. Keep attribution visible. The catalog is used for missing cards, art, set/color counts, and foil display.
- `data/deck-card-metadata.json` maps catalog codes to full printed names and card types from the Riot-derived [Riftbound-card-data](https://github.com/slimtreble/Riftbound-card-data) export. The deck matcher uses it to distinguish champion subtitles that the compact catalog omits. It accepts quantity-and-name deck lines, groups required and owned copies by full card name, and lists unmatched lines separately. Rune and token exclusions are on by default; section headings and card codes help classify them. The deck matcher uses the snapshot currently being viewed and does not estimate prices.
- Catalog-only filters in `app/collection-client.tsx` use matching custom dropdowns for Set, Ownership, and Rarity/printing. Set and Ownership allow one choice; Rarity uses checkboxes for multiple rarities and printings, with `All rarities` as a reset option. An empty rarity selection means all rarities. There is no `Normal cards` preset or separate alternate art and over-numbered exclusion controls. `lib/rarity.ts` centralizes printing classification. Filters do not change saved inventory, summaries, imports, or exports. The `Missing` option shows zero-copy cards and remains visible before the statistics panel on phones.
- The quantity badge shows total copies and gains a subtle foil finish for owned Rare, Epic, Showcase, or over-numbered printings, or when an imported row explicitly records foil copies. Proving Grounds is excluded from rarity-based foil inference because its box printings are nonfoil. Keep the badge's treatment tied to reliable catalog rarity or the imported finish, never to image appearance.
- A card tile opens a larger, keyboard-accessible card view with its inventory count, rarity label, and a prominent per-card estimated price with standard/foil breakdown when available. Rarity filters, card tiles, and details use text rather than separate rarity icons; the printed card art still shows its own rarity marking. The header uses the owner-supplied orange logo in `public/riftbound-logo.png`.
- `app/api/prices/route.ts` fetches Cardmarket's public Riftbound product catalogue and daily price guide (game 22) server-side. `avg7` and `avg7-foil` are recent EUR sale averages. The route requires ChatGPT authentication and caches a successful download for two hours. It refuses guide data more than three days old. Only a unique Cardmarket product matched to a unique catalog name within a known set is quoted; unmatched, ambiguous, and inventory-only extra printings remain unpriced. The card view also withholds base-product estimates for over-numbered, alternate-art, and Showcase printings. The collection view shows price coverage and uses quoted owned finishes for the most valuable card. Keep price estimates separate from saved inventory and avoid representing partial coverage as a total collection valuation.
- `lib/collection.ts` parses and exports the Card Nexus CSV format and compares full snapshots. An import replaces the prior snapshot; it does not add quantities to it. The importer preserves every source column for round-trip export.

## Changes and verification

- Change the Drizzle schema in `db/schema.ts`, generate a new migration, and preserve already-applied migration files. Do not seed user rows in migration SQL.
- Run TypeScript checking and the Sites build after product changes. Check the supplied CSV round trip and a repeated-import preview when import logic changes.
- Run the deck parser check with the user's supplied deck text when matching logic changes.
- Publish the pushed source with the Sites workflow and verify the deployment reaches `succeeded`.

## Known catalog limits

The gallery snapshot does not have exact art for a few tokens and promo printings in the Card Nexus file. Their inventory quantities are preserved; unmatched entries use a same-number base card image when available, otherwise an image-unavailable tile. Vendetta promo cards are shown as a separate set.

## Deferred to-do list

Record future user-provided to-do items here. Treat them as backlog, not authorization to implement or publish them. Update the list as the user adds, revises, or completes items.

No deferred items remain. Inventory history and the deck matcher were implemented in the September 2026 update. A "restore as current" action was not requested.

The discoverable `Not owned` view and foil quantity badge were implemented in the September 2026 update. The separate alternate art and over-numbered checkboxes were subsequently removed at the user's request.
