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

The two owner-supplied screenshot examples are used unchanged: `energy-example.png` shows 3 Energy; `mixed-cost-example.png` shows 6 Energy plus one Fury Power. They are explained as separate Energy and Power payments, with the same exhausted rune eligible for recycling. No invented recycle glyph is presented as a printed card symbol; the Lucide helper is explicitly labelled.

## Validation

Visual and interaction QA used the actual page component in a temporary, unauthenticated local harness. The harness is removed before production packaging; `/rules` continues to require the existing ChatGPT authentication. No production collection writes or paid AI requests were made.

Checked desktop and 390px/320px iframe layouts, topic switching, Radiance filter, keyword disclosures, search and clear, Pre-Rift search routing, all symbol image loads, and horizontal overflow. Required verification also includes TypeScript with `--incremental false`, existing builder and adviser checks, and the Sites build.
