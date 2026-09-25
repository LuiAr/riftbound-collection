# Riftbound Collection

Private source for the [Riftbound Collection website](https://riftbound.louisar.chatgpt.site). The site imports Card Nexus CSV exports, tracks collection history, compares pasted deck lists with owned cards, and shows rarity and Cardmarket price estimates where a reliable match exists.

## Privacy

This repository contains `data/initial-inventory.json`, the owner's original Card Nexus export used to seed the private Site. Keep the repository private. Do not copy that file into public assets or expose it through an unauthenticated route.

## Development

Requires Node.js 22.13 or newer. Install with `npm ci`, then use `npm run dev` for local development, `./node_modules/.bin/tsc --noEmit` for type checking, and `npm run build` for the production build. Local development uses the Sites/Vinext mock sign-in and D1 setup described in [AGENTS.md](AGENTS.md); the hosted Site uses Sign in with ChatGPT and its own D1 database.

## Deployment

GitHub is a private source mirror. Pushing here does not publish the website. Follow [AGENTS.md](AGENTS.md) and the Sites workflow to build, push the Site source, deploy privately, and verify success. Push the same commit to this GitHub repository after a successful Sites publication.

Card images and names are © Riot Games. Catalog data comes from [riftbound-cards](https://github.com/LouisCourrian/riftbound-cards); see the website for attribution.
