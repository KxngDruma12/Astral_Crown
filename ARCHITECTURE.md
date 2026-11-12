# Architecture

## Runtime

The game is a dependency-free browser application served by a small Node.js HTTP server. Solo collection, deck edits, settings, profile statistics, campaign progress and active-battle snapshots persist in browser local storage.

## Modules

- `cards.js`: faction definitions, Leader definitions, card catalogue generation and six starter deck lists.
- `engine.js`: authoritative game state, turn sequencing, Aether, Ascension, summon validation, spell/relic resolution, combat, damage, triggers, signatures, deck validation and AI decisions. Multiplayer can supply a seeded random function for reproducible server-side shuffles.
- `main.js`: modular UI implementation for the current engine and its solo battle flow.
- `index.html`: installed browser shell and existing story/solo interface.
- `multiplayer.mjs`: server-side room lifecycle, player tokens, action validation, state redaction, sequence checks and event broadcasting.
- `multiplayer-client.js` / `multiplayer.html` / `multiplayer.css`: online lobby and battle client.
- `server.mjs`: static asset server plus the online multiplayer API.
- `protocol.js`: versioned action and snapshot envelope contract.

## State ownership

The engine owns all battle outcomes. The UI may request an action, but the engine validates phase, resources, level requirements, zone availability and targets before changing state. The online server owns the live match and only broadcasts confirmed snapshots. Clients render confirmed state; they never calculate battle outcomes.

## Networking boundary

The first online slice supports room creation/joining, two ready players, starter deck selection, server-authoritative turns, sequenced actions, hidden opponent hands/decks, and reconnect snapshots over Server-Sent Events. Accounts, custom deck ownership, persistent rooms, ranked matchmaking and production operations remain outside this slice.
