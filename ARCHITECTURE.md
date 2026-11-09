# Architecture

## Runtime

The first build is a dependency-free browser application using native ES modules and a tiny Node static server. It is intentionally local-first: collection, deck edits, settings, profile statistics, campaign progress and active battle snapshots persist in `localStorage`.

## Modules

- `src/cards.js`: faction definitions, Leader definitions, card catalogue generation and six starter deck lists.
- `src/engine.js`: authoritative game state, turn sequencing, Aether, Ascension, summon validation, spell/relic resolution, combat, damage, triggers, signatures, deck validation and AI decisions.
- `src/main.js`: UI rendering, navigation, player actions and AI turn orchestration. UI code calls engine functions; it does not calculate battle outcomes.
- `src/style.css`: responsive visual system and battlefield presentation.
- `tests/engine.test.js`: deterministic rule-engine tests.

## State ownership

The engine owns all battle outcomes. The UI may request an action, but the engine validates phase, resources, level requirements, zone availability and targets before changing state. Visual state is derived from the returned game state. The AI uses the same `playCard`, `ascend` and `attack` functions as the human player.

## Networking boundary

A versioned action/snapshot contract lives in `src/network/protocol.js`; the detailed release boundary is in `ONLINE_MULTIPLAYER.md`. There is no online battle transport, matchmaking service, account service or authoritative remote server in this version. Online play must not be exposed as available until a server-authoritative match protocol, reconnect handling, action validation and synchronization tests exist.
