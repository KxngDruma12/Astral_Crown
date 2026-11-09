# ASTRACROWN: LEGACY OF THE SIX

An original, mobile-first anime fantasy trading-card battle game. This repository contains the first playable local build.

## Run locally

Requires Node.js 20+. No third-party packages are required.

```bash
npm start
```

Open `http://localhost:4173`. For a static production bundle run `npm run build`, then serve the `dist/` folder with `node server.mjs dist`. Run the rule tests with `npm test`.

## Current playable slice

- Six original factions and six unique Ascension Leaders.
- Generated original card catalogue with units, spells, relics and five trigger types.
- Six faction starter decks, deck selection, deck editing, deck validation, searchable/filterable collection, detailed card views and local persistence.
- 1v1 battle loop with 6-damage defeat, Aether, Leader Ascension, formations, attacks, combat, trigger reveals, Sovereign Signatures and Easy/Normal/Hard solo AI profiles.
- Player profile, story shell, active-battle save/resume, and responsive mobile/desktop layout.

## Rules decisions in this build

- The first player skips their first draw.
- Each player's maximum Aether increases by one at the start of each of their turns, to 10, and available Aether refills.
- Ascension stages unlock on the player's 2nd, 4th and 6th turn; the cost equals the destination stage.
- When a Leader is hit, the defender reveals the top card. A Trigger resolves and goes to discard; a non-Trigger goes to hand and causes one damage. Six damage loses immediately.
- Heal Triggers only heal at 3 or more damage, so they cannot erase early-game damage. Rarity is not a power ladder: unit levels and power vary independently of rarity.
- Main deck format is 50 cards, max four copies, one faction, and exactly ten Triggers.

## Known limitations

This is a first playable vertical slice, not the complete feature list. Story chapters are scaffolding, Practice Mode and local hot-seat multiplayer are not implemented, online multiplayer is not live (only its protocol contract is documented), audio assets are not bundled, and card art currently uses original procedural faction sigils rather than commissioned character illustrations. Easy/Normal/Hard AI profiles exist, but Hard still needs deeper multi-turn threat prediction and balance tuning. The card pool is generated for breadth; balance, optional target/choice prompts, mulligan, and deeper campaign content still need dedicated passes.
