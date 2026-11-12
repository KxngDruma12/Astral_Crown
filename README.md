# ASTRACROWN: LEGACY OF THE SIX

An original, mobile-first anime fantasy trading-card battle game. The browser build includes solo battles and a playable online 1v1 arena.

## Run locally

Requires Node.js 20+. No third-party packages are required.

```bash
npm start
```

Open `http://localhost:4173`. The online arena is at `http://localhost:4173/multiplayer`.

To play with someone on another device on the same network, start the server on your computer and have the other player open the computer's LAN address on port 4173. Both players must be able to reach that server. Create a room, share its six-character code, choose a faction deck, and both press Ready.

For a static production bundle run `npm run build`, then serve the `dist/` folder with `node server.mjs dist`. The Node server must remain running because it also hosts the multiplayer API. A static-only host such as GitHub Pages cannot run the match server.

## Current playable slice

- Six original factions and six unique Ascension Leaders.
- Generated original card catalogue with units, spells, relics and five trigger types.
- Six faction starter decks, deck selection, deck editing, deck validation, searchable/filterable collection, detailed card views and local persistence.
- 1v1 battle loop with 6-damage defeat, Aether, Leader Ascension, formations, attacks, combat, trigger reveals, Sovereign Signatures and Easy/Normal/Hard solo AI profiles.
- Online 1v1 rooms with six-character join codes, faction selection, ready-up flow, live Server-Sent Events, ordered action sequences, reconnect snapshots and server-authoritative battle resolution through the shared rules engine.
- Player profile, story shell, active-battle save/resume, and responsive mobile/desktop layout.

## Online multiplayer notes

- Online matches currently use the six official starter decks. Custom deck ownership and account authentication are not connected.
- Match rooms live in server memory and expire after one hour of inactivity. Restarting the server ends active rooms.
- The server validates turn ownership, action type, formation positions, phase, resources and the current state sequence. Opponent hands and deck contents are hidden from each player's snapshot.
- For public internet play, deploy the Node server behind HTTPS and a reverse proxy that supports long-lived Server-Sent Event connections. Do not expose the server over plain HTTP on an untrusted network.

## Rules decisions in this build

- The first player skips their first draw.
- Each player's maximum Aether increases by one at the start of each of their turns, to 10, and available Aether refills.
- Ascension stages unlock on the player's 2nd, 4th and 6th turn; the cost equals the destination stage.
- When a Leader is hit, the defender reveals the top card. A Trigger resolves and goes to discard; a non-Trigger goes to hand and causes one damage. Six damage loses immediately.
- Heal Triggers only heal at 3 or more damage, so they cannot erase early-game damage. Rarity is not a power ladder: unit levels and power vary independently of rarity.
- Main deck format is 50 cards, max four copies, one faction, and exactly ten Triggers.

## Known limitations

This is an expanding playable build, not the complete feature list. Online multiplayer is an initial server-authoritative 1v1 slice, not a full account or matchmaking service. It does not yet include ranked queues, invitations, spectator mode, persistent match history, custom-deck synchronization, chat, anti-cheat telemetry or production load testing. Story chapters remain scaffolding, audio assets are not bundled, and card art currently uses original procedural faction sigils rather than commissioned character illustrations. Easy/Normal/Hard AI profiles exist, but Hard still needs deeper multi-turn threat prediction and balance tuning.
