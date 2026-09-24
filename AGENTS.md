# Riftbound Collection Site

This directory is the source checkout for the private Sites app identified by `.openai/hosting.json`. Follow the parent project's `AGENTS.md` and the Sites building and hosting skills before changing or publishing it.

## Architecture

- Vinext renders the collection at `/` and uses dispatch-owned Sign in with ChatGPT. The authenticated Site user ID scopes every collection read and write.
- D1 holds versioned Card Nexus inventory snapshots. `collection_meta.active_import_id` selects the current snapshot; imports stage rows before switching that pointer, so a failed upload cannot clear the previous collection.
- `data/initial-inventory.json` contains the user's supplied 2026-09-24 export. Only the first authenticated owner of this private Site is seeded with it. Do not put it in public assets or expose it through an unauthenticated route.
- `data/catalog.json` is a compact snapshot of [riftbound-cards](https://github.com/LouisCourrian/riftbound-cards) release `v2026-09-23`; names and Riot CDN image URLs originate from Riot's card gallery. Keep attribution visible. The catalog is used for missing cards, art, and set/color counts.
- `lib/collection.ts` parses and exports the Card Nexus CSV format and compares full snapshots. An import replaces the prior snapshot; it does not add quantities to it. The importer preserves every source column for round-trip export.

## Changes and verification

- Change the Drizzle schema in `db/schema.ts`, generate a new migration, and preserve already-applied migration files. Do not seed user rows in migration SQL.
- Run TypeScript checking and the Sites build after product changes. Check the supplied CSV round trip and a repeated-import preview when import logic changes.
- Publish the pushed source with the Sites workflow and verify the deployment reaches `succeeded`.

## Known catalog limits

The gallery snapshot does not have exact art for a few tokens and promo printings in the Card Nexus file. Their inventory quantities are preserved; unmatched entries use a same-number base card image when available, otherwise an image-unavailable tile. Vendetta promo cards are shown as a separate set.

## Deferred to-do list

Record future user-provided to-do items here. Treat them as backlog, not authorization to implement or publish them. Update the list as the user adds, revises, or completes items.

- Add a catalog-view filter that hides alternate printings and cards numbered beyond the regular set total. It should let the user browse realistically obtainable cards while keeping any owned copies in the saved collection and exports. Do not implement until the user asks to work on this item.
- Make the filter for cards with zero owned copies easy to find and use, including on a phone. The current view has a `Missing` filter; verify that it meets this request rather than adding a duplicate control.
- Revise foil display: keep the quantity badge as the total owned count, and give it a subtle shiny treatment when at least one owned copy is foil. Use the same treatment for printings that are always foil, without a redundant “foil” label. For printings that can be standard or foil, show the treatment only when the collection has a foil copy. Replace the current separate foil badge as part of this change; identify always-foil printings from reliable card data before implementing.
