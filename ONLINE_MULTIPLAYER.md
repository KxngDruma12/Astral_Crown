# Online Multiplayer

Online 1v1 play is implemented as an initial server-authoritative slice.

## Run it

Requires Node.js 20+.

```bash
npm start
```

Open `http://localhost:4173/multiplayer`. Create a room, share its six-character code, and have the second player join. Both players choose one of the six official starter decks and press Ready.

For two devices on the same network, the host device runs the Node server and the other device opens the host's LAN IP on port 4173. Public deployment requires HTTPS and a host that supports long-lived Server-Sent Event connections.

## Authority and synchronization

- The server owns both game states, deck shuffles, turn ownership, phases, card draws, effects and match results.
- The shared `engine.js` rules engine resolves every accepted action. Multiplayer uses the same game engine as the modern solo battle module rather than the demonstration StubEngine.
- Clients send intent actions only: `PLAY_CARD`, `ASCEND`, `ATTACK`, `SIGNATURE` and `ADVANCE_PHASE`.
- Each accepted action increments a match sequence. Clients submit the sequence they last observed; stale actions are rejected and clients fetch the latest snapshot.
- Server-Sent Events deliver state and match events. EventSource reconnects automatically, and a fresh state request restores the current view.
- Opponent hand and deck card data are redacted per seat. Only card counts are disclosed.
- Match tokens are random, high-entropy bearer tokens. They are held in the browser tab's session storage for refresh recovery.

## Current scope and release gaps

- Six official starter decks only. Custom deck synchronization and server-side deck ownership checks are not connected.
- No account identity, ranked matchmaking, persistent match history, chat, spectator mode, abuse-report workflow or production anti-cheat telemetry.
- Match state is in memory and rooms expire after one hour of inactivity. Restarting the process ends all active matches.
- Add distributed storage, authenticated accounts, matchmaking, operational monitoring, rate limits at the edge, abuse controls, load testing and recovery drills before treating this as a public competitive service.
- A static host such as GitHub Pages can serve the client files but cannot host the Node match API. The Node server and static client must be deployed together, or the API must be deployed separately and the client configured to use it.
