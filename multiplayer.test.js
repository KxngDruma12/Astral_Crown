import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { starterDecks } from './cards.js';
import { handleMultiplayerApi } from './multiplayer.mjs';
import { createGame } from './engine.js';

async function testServer(t) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      await handleMultiplayerApi(req, res, url);
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(error.status || 500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

async function post(base, path, body) {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

async function get(base, path) {
  const response = await fetch(base + path);
  return { status: response.status, body: await response.json() };
}

test('online match supports two seats, ready-up, turn authority and private hands', async t => {
  const base = await testServer(t);
  const created = await post(base, '/api/match', { deckId: starterDecks[0].id });
  assert.equal(created.status, 201);
  const { matchId, token: hostToken } = created.body;
  assert.match(matchId, /^[A-Z2-9]{6}$/);

  const joined = await post(base, `/api/match/${matchId}/join`, { deckId: starterDecks[1].id });
  assert.equal(joined.status, 200);
  const guestToken = joined.body.token;

  assert.equal((await post(base, `/api/match/${matchId}/ready`, { token: hostToken })).body.started, false);
  assert.equal((await post(base, `/api/match/${matchId}/ready`, { token: guestToken })).body.started, true);

  const hostState = await get(base, `/api/match/${matchId}/state?token=${hostToken}`);
  assert.equal(hostState.status, 200);
  assert.equal(hostState.body.phase, 'draw');
  assert.equal(hostState.body.active, 0);
  assert.ok(hostState.body.players[0].hand.every(card => !card.hidden));
  assert.ok(hostState.body.players[1].hand.every(card => card.hidden));
  assert.ok(hostState.body.players[1].deck.every(card => card.hidden));
  assert.ok(!JSON.stringify(hostState.body).includes('umbral-unit-'));

  const outOfTurn = await post(base, `/api/match/${matchId}/action`, {
    token: guestToken, expectedSeq: 0, action: { type: 'ADVANCE_PHASE' },
  });
  assert.equal(outOfTurn.status, 409);

  const advance = await post(base, `/api/match/${matchId}/action`, {
    token: hostToken, expectedSeq: 0, action: { type: 'ADVANCE_PHASE' },
  });
  assert.equal(advance.status, 200);
  assert.equal(advance.body.seq, 1);

  const stale = await post(base, `/api/match/${matchId}/action`, {
    token: hostToken, expectedSeq: 0, action: { type: 'ADVANCE_PHASE' },
  });
  assert.equal(stale.status, 409);

  const badToken = await get(base, `/api/match/${matchId}/state?token=not-a-session`);
  assert.equal(badToken.status, 403);
});

test('room capacity and deck IDs are validated', async t => {
  const base = await testServer(t);
  const invalidDeck = await post(base, '/api/match', { deckId: 'made-up-deck' });
  assert.equal(invalidDeck.status, 400);

  const created = await post(base, '/api/match', { deckId: starterDecks[0].id });
  const { matchId } = created.body;
  const guest = await post(base, `/api/match/${matchId}/join`, { deckId: starterDecks[1].id });
  assert.equal(guest.status, 200);
  const full = await post(base, `/api/match/${matchId}/join`, { deckId: starterDecks[2].id });
  assert.equal(full.status, 409);
});

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('the shared engine supports reproducible server-side deck shuffles', () => {
  const first = createGame(starterDecks[0], starterDecks[1], { random: mulberry32(42) });
  const second = createGame(starterDecks[0], starterDecks[1], { random: mulberry32(42) });
  assert.deepEqual(
    first.players.map(player => player.deck.map(card => card.id)),
    second.players.map(player => player.deck.map(card => card.id)),
  );
});
