# Rules and reference

Added 2026-10-16 at the authenticated `/rules` route. The reference does not access collection records, provider APIs, generation or prices. Existing collection navigation links to it. Return links select the existing deck/history sections through the supported `section` query parameter.

The page preserves Figtree, orange accent and existing neutral tokens. Search and topic controls stay visible while scrolling. Individual glossary entries use native, keyboard-accessible disclosures. Four topic panels avoid displaying the whole reference at once. Hash links support reopening a topic, for example `/rules#prerift`.

## Sources checked

- [Official Rules Hub](https://playriftbound.com/en-us/rules-hub/).
- [Core Rules, 2026-10-09](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/5c7946f7c3b8c6e0faff85ab6dadc6d2e721ea94.pdf), particularly symbols/resources, turns, combat, scoring and keyword sections 805-832.
- [Tournament Rules, 2026-10-09](https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/861752822d217edf37d9febaeaf77a7d924c1bb6.pdf), limited section 602.
- [Radiance Pre-Rift guide](https://playriftbound.com/en-us/news/announcements/preparing-for-the-radiance-pre-rift/).
- [Radiance changes effective 2026-10-16](https://playriftbound.com/en-us/news/announcements/core-rules-radiance-patch-notes-effective-october-16-2026/).
- [Optional start-of-game playtest](https://playriftbound.com/en-us/news/organizedplay/testing-start-of-game-rules/), announced 2026-10-15, not applied as a universal rule.
- The owner's French community sealed reference, credited to Grostoast and dated 2026-10-13, is retained in `public/rules/radiance-sealed-cheatsheet.jpg`.

## Image provenance

All game imagery is Riot artwork. Domain icon extracts use the bottom-right icon of the existing Origins common Rune images in `data/catalog.json` with the Riot CDN's crop parameters. Exhaust uses Iron Ballista (OGN-017), Might uses Jinx, Demolitionist (OGN-030), and any-domain Power uses Gold (SFD-T03). The cropped files are local assets so the reference does not depend on remote icon loads. Ordinary interface icons remain Lucide.

The two owner-supplied screenshot examples are used unchanged: `energy-example.png` shows 3 Energy; `mixed-cost-example.png` shows 6 Energy plus one Fury Power. They are explained as separate Energy and Power payments, with the same exhausted rune eligible for recycling. Recycle now uses an extract of the printed word, rather than a helper glyph.

### Printed labels added 2026-10-16

All 28 keywords now display authentic raster extracts of their printed labels, preserving the original green, pink, lime and grey treatments and typography. The shared entry component uses the same assets in keyword filters and search results. Buff, Burn, Mighty, Predict and Stun also use their actual printed labels. Ordinary terms without a distinctive printed badge retain readable text. Recycle uses its actual printed word instead of a helper icon, and the Energy illustration is a real inline 1 Energy symbol from Blazing Scorcher.

`data/rules-printed-labels.json` records the original Riot CDN image URL, source-card gallery link, pixel crop rectangle and output dimensions for each of the 34 label assets in `public/rules/printed`. The extracts come from the official English gallery retrieved on 2026-10-16. Backgrounds outside the printed label shape are transparent. These are source-image extracts, without recreated text or generated artwork. The supplied Accelerate screenshot is the visual reference; the higher-resolution extract comes from Blazing Scorcher, OGN-001/298.

Variable numbers and costs on these extracts are examples from the source card. The page explicitly instructs players to use the value on their own card. Generic entries such as Hunt X and Level N retain their variable name beside the image. Expanded entries link to the source card and continue to link to the Core Rules. The images have accessible text alternatives and intrinsic dimensions, and their displayed size respects narrow phone layouts.

## Validation

Visual and interaction QA used the actual page component in a temporary, unauthenticated local harness. The harness is removed before production packaging; `/rules` continues to require the existing ChatGPT authentication. No production collection writes or paid AI requests were made.

Checked desktop and 390px/320px iframe layouts, topic switching, Radiance filter, keyword disclosures, search and clear, Pre-Rift search routing, all symbol image loads, and horizontal overflow. Required verification also includes TypeScript with `--incremental false`, existing builder and adviser checks, and the Sites build.

The printed-label update was visually checked in the real page component at desktop size and in 390px and 320px iframe viewports. All 33 glossary images loaded in both narrow layouts with no horizontal overflow. Accelerate search retained its image and disclosure/source links; the Radiance filter displayed Deploy, Disarm and Show Off. The 34-asset source manifest covers every one of the 28 keywords. Temporary preview routes were removed before packaging. TypeScript and the existing builder/adviser suites passed.
