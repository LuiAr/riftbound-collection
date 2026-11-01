# Riftbound Collection

Static collection site for one player, published with GitHub Pages from this repository at [https://luiar.github.io/riftbound-collection/](https://luiar.github.io/riftbound-collection/).

The site shows the Card Nexus collection, rarity, Cardmarket price estimates, a one-of-each goal, deck lists, and comparisons between dated collection exports. Card images and names are © Riot Games. Catalog data comes from [riftbound-cards](https://github.com/LouisCourrian/riftbound-cards).

## Privacy

`data/collection.csv` and every file in `data/exports/` are part of the published site. GitHub Pages output is publicly reachable even when this repository is private. Publishing from a private repository needs a paid GitHub plan. Do not commit a collection export you do not want on the public web.

Deck lists typed in the browser stay in `localStorage`. Download `saved-decks.json` and commit it as `data/saved-decks.json` if those lists should travel with the site. A browser with no saved decks loads that file. Importing a JSON file replaces the decks in that browser.

## Update the collection

1. Export the collection from Card Nexus as CSV.
2. Save it as `data/exports/YYYY-MM-DD.csv`.
3. Replace `data/collection.csv` with the same file. The site treats that file as the current collection. If it matches a dated export, that export's date is shown. If it does not, it is still shown as current and should be copied into `data/exports/` so history has a date.
4. Commit and push to `main`.

`data/exports/2026-09-24.csv` is the earlier supplied export (263 rows). `data/exports/2026-11-01.csv` matches the current scan (453 rows). `data/initial-inventory.json` remains for the CSV round-trip check.

The collection view can compare a CSV in the browser before you commit it. That comparison is not saved.

## Prices, decks and rules

`npm run build` downloads the Cardmarket price guide and a euro exchange rate, then embeds them. The card view shows the guide date. Rebuild to refresh prices. The build also checks Riot's rules hub. If the pinned Standard documents or ban list no longer match, deck search says so and does not treat the rules as current.

The same build refreshes Radiance from the latest [riftbound-cards](https://github.com/LouisCourrian/riftbound-cards) `cards.json` into `data/generated/radiance-catalog.json`. Owned Radiance printings use that list for art and rarity. The one-of-each goal counts Radiance numbers 1–167 at Common, Uncommon, and Rare when that checklist is complete. The Pre-Rift promo has no separate gallery card, so it keeps the CSV name, number, foil quantity, and Card Nexus price on a Radiance Promos tile with an image placeholder and unknown rarity. Cardmarket's mapped expansions do not include Radiance, so those cards show the export price instead of a 7-day sale average. Deck search still uses the reviewed pre-Radiance card list.

Paid AI deck generation needed a server and an API key, so that action is unavailable. Find collection decks, deck matching, review, and upgrades run in the browser from the embedded collection, prices, and rules check.

## Development

Requires Node.js 22.13 or newer. Install with `npm ci`.

- `npm run dev` regenerates `data/generated/` and starts Next.js at `http://localhost:3000/riftbound-collection/`.
- `npm run build` writes the static site to `out/`.
- `npx tsc --noEmit --incremental false` typechecks the project.
- `node --test tests/*.test.ts` runs the unit tests.
- `node scripts/test-builder.mjs` and `node scripts/test-adviser.mjs` run the offline deck checks.

GitHub Actions (`.github/workflows/pages.yml`) builds on every push to `main` and deploys with `actions/deploy-pages`. In the repository settings, Pages must use **Source: GitHub Actions**. This workflow does not change repository visibility.
