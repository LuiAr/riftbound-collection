# Set Atlas visual verification — 2026-10-13

final result: passed

## Evidence and comparison state

- Selected visual truth: `/Users/louisar/.codex/generated_images/01a13421-66c7-7990-8ad1-85b0c0e2f15b/exec-a6e44001-cbbd-49f4-9e02-017079cf2317.png` (displayed option 2).
- Implementation: `http://localhost:5173/`, using the existing Vinext/Sites development runtime and an isolated local D1 database. Production authentication and data were not altered.
- Implementation screenshots: `outputs/design-qa/desktop-final.jpg`, `phone-top.jpg`, `phone-final.jpg`, `tablet.jpg`, `card-dialog.jpg`, `decks-desktop.jpg`, `builder-desktop.jpg`, `builder-phone.jpg`, and `history-desktop.jpg`. Evidence stays in ignored local outputs, outside public assets.
- Desktop CSS viewport: 1487 × 1058, devicePixelRatio 1. Source pixels: 1487 × 1058. Browser capture pixels: 1472 × 1047; the browser capture includes a small viewport/capture size difference. The comparison copy is scaled to the source dimensions (about 1.01×); originals are retained.
- Full-view combined comparison: `outputs/design-qa/comparison-final.png`, with the source on the left and implementation on the right. Focused, combined comparisons: `header-final.png` and `gallery-final.png`. Both artifacts were inspected together; the review was not based on separate remembered views.
- Matched interaction state: My collection, Vendetta, All cards, empty search, All rarities, collapsed insights, light theme, signed-in local development account. Phone checks used 390 × 844 and 320 × 740; tablet check used 1024 × 900.
- Data difference is intentional: the local account uses the owner's supplied September 24 export (160 Vendetta printings), while the mock depicts the September 30 import (165). Account name, dates, quantities and percentages therefore differ. Generated second-row card names/artwork are not authoritative catalog content; implementation retains actual catalog artwork, names and ordering. No invented inventory was added to make the screenshot match.

## Findings and comparison history

1. **[P2, fixed] Desktop major-region proportions.** The first combined comparison (`comparison-first.png`, `header-first.png`) showed the sidebar and left canvas starting too far left, and the set summary occupying too much width relative to the goal. Adjusted the sidebar to 280px, the goal track to 338px and summary spacing. The final combined captures show the selected left-rail layout, aligned control row and five-column gallery. No actionable major-region mismatch remains.
2. **[P2, fixed] Phone completion summary delayed browsing.** `phone-first.jpg` showed an always-visible goal block pushing the filters and cards down. Moved the same goal component into the existing collapsible Collection insights panel on narrow screens. `phone-top.jpg` and `phone-final.jpg` show the corrected hierarchy and full two-column card shapes; opening insights exposes the completion count and missing-card list. No information was removed.
3. **Expected content constraint:** printed card artwork retains its 744:1039 aspect ratio, full corners and actual rules text. Some mock cards were visually compressed; the implementation preserves their correct shape, so the second row sits lower. This is intentional rather than an invitation to distort the cards.

## Required fidelity surfaces

- **Fonts and typography:** the existing self-hosted Figtree variable font is loaded. Heavy sentence-case headings, readable form text, tabular counts, muted secondary text and established title truncation are preserved. Compared headings, navigation, counts, labels and card captions in the focused header/gallery captures.
- **Spacing and layout rhythm:** persistent left navigation, set rows, account footer, unboxed collection summary, goal beside summary and full-width five-column gallery match the selected structure. Phone navigation and gallery each use two columns. No horizontal viewport overflow was observed at 1487, 1024, 390 or 320px widths.
- **Colors and tokens:** retained the existing orange accent, cool neutral surfaces, night-blue text and domain colors; all new styling uses existing tokens. The generated mock's subtle background shading and artificial current-date label were not added to the product.
- **Image quality and assets:** retained original supplied logo and real Riot-derived card art. No generated replacement card images, approximate logos, CSS illustrations or invented card content were used. Full card corners and printing-specific badges remain visible; enlarged card view was inspected.
- **Copy and content:** retained real set names, actual quantities, exclusions, price coverage, EUR price method, attribution and availability messages. All sets and Collection insights remain available even though the concept did not emphasize those controls. Paid generation and free collection search remain separate.

## Browser interaction checks

- Desktop set selectors switch Vendetta → Unleashed → All sets → Vendetta, with corresponding headings and counts.
- Need copies + Dune Surfer search returns one card, one of three owned and two more needed. Opening the card displays those same counts, full artwork and existing price disclosure. Closing returns keyboard focus to the originating card.
- Rarity menu retains Common and Uncommon as simultaneous checked choices; All rarities resets them.
- Unmatched search displays the empty state; Clear filters restores the gallery.
- Collection insights exposes By domain and Card values. Phone Set picker switches Origins → Vendetta. Phone insights exposes One of each.
- Decks & upgrades opens its existing workspace; an unsaved local list `3x Dune Surfer` shows three needed, one covered and two missing. No deck was saved or production inventory written.
- Builder and History remain reachable on desktop and phone. Builder's missing local AI setup message remains visible and Generate deck stays disabled. No generation or paid provider request was made.
- Browser error logs were inspected. The initial pre-migration local startup recorded `no such table: bootstrap_owner`; applying the existing migrations to the isolated local database resolved it. No additional browser errors appeared during the interaction checks.

## Validation and limits

- TypeScript (`--noEmit --incremental false`): passed.
- Original offline builder suite: passed (source validation, budget/identity, quality/strategy, progress, server isolation and background jobs).
- Frozen adviser replay: passed (collection scenarios, release previews and persistence/account isolation).
- Production Sites build: passed; existing large-client-chunk advisory remains non-blocking.
- No API, schema, catalog, import/export algorithm, pricing algorithm, AI spending or rule freshness changes. No paid AI, games or production writes were used for visual QA. This report makes no new deck-strength or gameplay claim.

## Implementation checklist

- [x] Apply selected navigation, set browser and gallery hierarchy.
- [x] Retain existing art, controls, features and data boundaries.
- [x] Fix P2 issues and recapture combined evidence.
- [x] Inspect phone, tablet, card details and secondary screens.
- [x] Complete required offline checks, type checking and build.
- [x] Update AGENTS.md alongside the visual implementation.

## Follow-up polish

No outstanding P0/P1/P2 findings. Minor density differences caused by correctly proportioned real cards are accepted. The local preview intentionally shows its isolated development account and original import rather than pretending to be the production account.
