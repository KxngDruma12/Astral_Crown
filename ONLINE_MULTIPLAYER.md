# Online Multiplayer Boundary (Not Live)

Online multiplayer is **not implemented**. The current browser build has no account service, matchmaking, transport, remote authority, synchronization, reconnect or anti-cheat service. This document defines the seam for a future server-authoritative implementation.

## Proposed authority model

1. A match server owns both player states, random seeds, turn ownership, phase, card draws and effect resolution.
2. Clients send intent envelopes, never state mutations. The server validates the active player, sequence number, phase, Aether, card ownership, target and legal action before applying an action through the same rules engine.
3. The server broadcasts a monotonically sequenced event or state snapshot. Clients render confirmed state only; animations are downstream presentation.
4. Reconnect uses the last confirmed sequence and a fresh authoritative snapshot. Duplicate or out-of-order actions are rejected.
5. Matchmaking assigns a server match ID and both authenticated player IDs. Account identity and deck ownership are verified server-side.

## Contract groundwork

`src/network/protocol.js` defines versioned action and snapshot envelopes and validates action types. It is a data-contract module only. It does not open sockets, authenticate users, create matches or synchronize state.

## Required before release

- Authenticated account/session service and deck ownership checks.
- Matchmaking queue, match lifecycle and server-side timeouts.
- Server-hosted deterministic rules engine and secure random seed handling.
- Ordered action/event stream, replay log, reconnect and desync recovery.
- Rate limits, anti-replay checks, anti-cheat validation and abuse reporting.
- Load, latency, packet-loss and concurrent-match tests.
