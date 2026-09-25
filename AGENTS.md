# Riftbound Collection Site

This directory is the source checkout for the private Sites app identified by `.openai/hosting.json`. Follow the parent project's `AGENTS.md` and the Sites building and hosting skills before changing or publishing it.

## Architecture

- Vinext renders the collection at `/` and uses dispatch-owned Sign in with ChatGPT. The authenticated Site user ID scopes every collection read and write.
- D1 holds versioned Card Nexus inventory snapshots. `collection_meta.active_import_id` selects the current snapshot; imports stage rows before switching that pointer, so a failed upload cannot clear the previous collection.
- `data/initial-inventory.json` contains the user's supplied 2026-09-24 export. Only the first authenticated owner of this private Site is seeded with it. Do not put it in public assets or expose it through an unauthenticated route.
- `data/catalog.json` is a compact snapshot of [riftbound-cards](https://github.com/LouisCourrian/riftbound-cards) release `v2026-09-23`; names, rarity, and Riot CDN image URLs originate from Riot's card gallery. Keep attribution visible. The catalog is used for missing cards, art, set/color counts, and foil display.
- Catalog-only filters in `app/collection-client.tsx` hide alternate art (`a` collector-number suffix, including alt runes, plus Vendetta `sp` special alt numbers) and over-numbered printings (numeric collector number above the regular set total). They do not change saved inventory, summaries, imports, or exports. The `Not owned` filter shows zero-copy cards and remains visible before the statistics panel on phones.
- The quantity badge shows total copies and gains a subtle foil finish for owned Rare, Epic, Showcase, or over-numbered printings, or when an imported row explicitly records foil copies. Proving Grounds is excluded from rarity-based foil inference because its box printings are nonfoil. Keep the badge's treatment tied to reliable catalog rarity or the imported finish, never to image appearance.
- `lib/collection.ts` parses and exports the Card Nexus CSV format and compares full snapshots. An import replaces the prior snapshot; it does not add quantities to it. The importer preserves every source column for round-trip export.

## Changes and verification

- Change the Drizzle schema in `db/schema.ts`, generate a new migration, and preserve already-applied migration files. Do not seed user rows in migration SQL.
- Run TypeScript checking and the Sites build after product changes. Check the supplied CSV round trip and a repeated-import preview when import logic changes.
- Publish the pushed source with the Sites workflow and verify the deployment reaches `succeeded`.

## Known catalog limits

The gallery snapshot does not have exact art for a few tokens and promo printings in the Card Nexus file. Their inventory quantities are preserved; unmatched entries use a same-number base card image when available, otherwise an image-unavailable tile. Vendetta promo cards are shown as a separate set.

## Deferred to-do list

Record future user-provided to-do items here. Treat them as backlog, not authorization to implement or publish them. Update the list as the user adds, revises, or completes items.

No deferred items remain. The alternate/over-numbered filters, discoverable `Not owned` view, and foil quantity badge were implemented in the September 2026 update.
