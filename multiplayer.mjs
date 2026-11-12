import { randomBytes, randomInt } from 'node:crypto';
import { starterDecks } from './cards.js';
import {
  createGame, advancePhase, ascend, canAscend, canActivateSignature,
  activateSignature, playCard, attack,
} from './engine.js';

const matches = new Map();
const deckById = new Map(starterDecks.map(deck => [deck.id, deck]));
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MATCH_TTL_MS = 60 * 60 * 1000;
const BODY_LIMIT = 16 * 1024;

const json = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
  });
  res.end(data);
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        reject(Object.assign(new Error('payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(Object.assign(new Error('invalid json'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function roomCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += ROOM_ALPHABET[randomInt(ROOM_ALPHABET.length)];
  return code;
}

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

function validDeck(deckId) {
  return typeof deckId === 'string' && deckById.has(deckId);
}

class Match {
  constructor(id, deckId) {
    this.id = id;
    this.seed = randomInt(1, 0x7fffffff);
    this.status = 'waiting';
    this.game = null;
    this.seq = 0;
    this.lastActivity = Date.now();
    this.eventLog = [];
    this.seats = [
      { token: randomBytes(32).toString('base64url'), deckId, ready: false, streams: new Set(), lastActionAt: 0 },
      null,
    ];
  }

  seatFor(token) {
    if (typeof token !== 'string' || !token) return -1;
    return this.seats.findIndex(seat => seat && seat.token === token);
  }

  touch() {
    this.lastActivity = Date.now();
  }

  stateFor(seatIndex) {
    if (!this.game) return { matchId: this.id, status: this.status, seq: this.seq, you: seatIndex };
    const snapshot = structuredClone(this.game);
    const hiddenSeat = snapshot.players[1 - seatIndex];
    hiddenSeat.hand = hiddenSeat.hand.map(() => ({ hidden: true }));
    hiddenSeat.deck = hiddenSeat.deck.map(() => ({ hidden: true }));
    snapshot.you = seatIndex;
    snapshot.seq = this.seq;
    snapshot.matchId = this.id;
    snapshot.status = this.status;
    return snapshot;
  }

  emitTo(seatIndex, event, payload) {
    for (const stream of this.seats[seatIndex]?.streams || []) {
      if (!stream.destroyed && !stream.writableEnded) {
        try {
          stream.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
        } catch {
          this.seats[seatIndex].streams.delete(stream);
        }
      }
    }
  }

  broadcast(event, payload) {
    this.seats.forEach((seat, index) => {
      if (seat) this.emitTo(index, event, payload);
    });
  }

  broadcastState() {
    this.seats.forEach((seat, index) => {
      if (seat) this.emitTo(index, 'match:state', this.stateFor(index));
    });
  }

  opponentStatus() {
    const opponent = this.seats[1];
    return { joined: !!opponent, ready: !!opponent?.ready };
  }

  startIfReady() {
    if (this.status !== 'waiting' || !this.seats[0]?.ready || !this.seats[1]?.ready) return false;
    const first = deckById.get(this.seats[0].deckId);
    const second = deckById.get(this.seats[1].deckId);
    this.game = createGame(first, second, { random: mulberry32(this.seed) });
    this.game.players[0].id = 'player-1';
    this.game.players[0].isAI = false;
    this.game.players[1].id = 'player-2';
    this.game.players[1].isAI = false;
    this.game.firstPlayer = 0;
    this.game.active = 0;
    this.status = 'active';
    advancePhase(this.game);
    this.broadcast('match:event', { type: 'started', firstPlayer: 0 });
    this.broadcastState();
    return true;
  }

  apply(seatIndex, action) {
    if (this.status !== 'active' || !this.game) return { ok: false, status: 409, error: 'match is not active' };
    if (this.game.active !== seatIndex) return { ok: false, status: 409, error: 'not your turn' };
    if (!action || typeof action !== 'object' || Array.isArray(action)) {
      return { ok: false, status: 400, error: 'invalid action' };
    }

    let result = { ok: false, error: 'unknown action' };
    switch (action.type) {
      case 'PLAY_CARD': {
        if (!Number.isInteger(action.handIndex) || action.handIndex < 0) {
          return { ok: false, status: 400, error: 'invalid hand index' };
        }
        const zone = action.zone || 'front';
        const slot = action.slot ?? 0;
        if (!['front', 'support'].includes(zone) || !Number.isInteger(slot) || slot < 0 || slot > 2) {
          return { ok: false, status: 400, error: 'invalid formation position' };
        }
        result = playCard(this.game, action.handIndex, zone, slot);
        break;
      }
      case 'ASCEND':
        if (this.game.phase !== 'ascension' || !canAscend(this.game.players[seatIndex])) {
          return { ok: false, status: 400, error: 'Ascension is not available' };
        }
        result = { ok: ascend(this.game) };
        if (!result.ok) result.error = 'Ascension was rejected';
        break;
      case 'ATTACK':
        if (typeof action.attackerUid !== 'string' || !action.attackerUid || typeof action.target !== 'string') {
          return { ok: false, status: 400, error: 'invalid attack target' };
        }
        result = attack(this.game, action.attackerUid, action.target);
        break;
      case 'SIGNATURE':
        if (this.game.phase !== 'main' || !canActivateSignature(this.game.players[seatIndex])) {
          return { ok: false, status: 400, error: 'Sovereign Signature is not available' };
        }
        result = { ok: activateSignature(this.game) };
        if (!result.ok) result.error = 'Sovereign Signature was rejected';
        break;
      case 'ADVANCE_PHASE':
        if (!['draw', 'ascension', 'main', 'battle', 'end'].includes(this.game.phase)) {
          return { ok: false, status: 400, error: 'phase cannot be advanced right now' };
        }
        advancePhase(this.game);
        result = { ok: true };
        break;
      default:
        return { ok: false, status: 400, error: 'unknown action' };
    }

    if (!result?.ok) return { ok: false, status: 400, error: result?.error || 'action rejected' };
    return { ok: true };
  }
}

function eventStream(req, res, match, seatIndex) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  res.write(': connected\n\n');
  match.seats[seatIndex].streams.add(res);
  const heartbeat = setInterval(() => {
    if (!res.destroyed && !res.writableEnded) res.write(': ping\n\n');
  }, 15000);
  const cleanup = () => {
    clearInterval(heartbeat);
    match.seats[seatIndex]?.streams.delete(res);
  };
  req.on('close', cleanup);
  res.on('close', cleanup);
  res.write(`event: hello\ndata: ${JSON.stringify({ matchId: match.id, seat: seatIndex, status: match.status })}\n\n`);
  if (match.game) match.emitTo(seatIndex, 'match:state', match.stateFor(seatIndex));
  match.emitTo(seatIndex, 'opponent:status', match.opponentStatus());
}

export async function handleMultiplayerApi(req, res, url) {
  if (!url.pathname.startsWith('/api/')) return false;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[1] === 'health' && req.method === 'GET') {
    json(res, 200, { ok: true, multiplayer: true });
    return true;
  }
  if (parts[1] !== 'match') {
    json(res, 404, { error: 'unknown api' });
    return true;
  }

  if (parts.length === 2 && req.method === 'POST') {
    const body = await readBody(req);
    const deckId = body.deckId || starterDecks[0].id;
    if (!validDeck(deckId)) {
      json(res, 400, { error: 'choose a valid starter deck' });
      return true;
    }
    let id;
    do { id = roomCode(); } while (matches.has(id));
    const match = new Match(id, deckId);
    matches.set(id, match);
    json(res, 201, { matchId: id, token: match.seats[0].token, seat: 0 });
    return true;
  }

  const matchId = parts[2];
  const match = matches.get(matchId);
  if (!match) {
    json(res, 404, { error: 'no such match' });
    return true;
  }
  match.touch();

  if (parts[3] === 'join' && req.method === 'POST') {
    if (match.status !== 'waiting' || match.seats[1]) {
      json(res, 409, { error: 'room is full or already started' });
      return true;
    }
    const body = await readBody(req);
    const deckId = body.deckId || starterDecks[1].id;
    if (!validDeck(deckId)) {
      json(res, 400, { error: 'choose a valid starter deck' });
      return true;
    }
    match.seats[1] = {
      token: randomBytes(32).toString('base64url'),
      deckId, ready: false, streams: new Set(), lastActionAt: 0,
    };
    match.broadcast('opponent:status', match.opponentStatus());
    json(res, 200, { matchId, token: match.seats[1].token, seat: 1 });
    return true;
  }

  if (parts[3] === 'events' && req.method === 'GET') {
    const seatIndex = match.seatFor(url.searchParams.get('token'));
    if (seatIndex < 0) {
      json(res, 403, { error: 'invalid session token' });
      return true;
    }
    eventStream(req, res, match, seatIndex);
    return true;
  }

  if (parts[3] === 'state' && req.method === 'GET') {
    const seatIndex = match.seatFor(url.searchParams.get('token'));
    if (seatIndex < 0) {
      json(res, 403, { error: 'invalid session token' });
      return true;
    }
    json(res, 200, match.stateFor(seatIndex));
    return true;
  }

  if (parts[3] === 'ready' && req.method === 'POST') {
    const body = await readBody(req);
    const seatIndex = match.seatFor(body.token);
    if (seatIndex < 0) {
      json(res, 403, { error: 'invalid session token' });
      return true;
    }
    if (match.status !== 'waiting') {
      json(res, 409, { error: 'match has already started' });
      return true;
    }
    if (body.deckId && !validDeck(body.deckId)) {
      json(res, 400, { error: 'choose a valid starter deck' });
      return true;
    }
    if (body.deckId) match.seats[seatIndex].deckId = body.deckId;
    match.seats[seatIndex].ready = true;
    match.broadcast('opponent:status', match.opponentStatus());
    const started = match.startIfReady();
    json(res, 200, { ok: true, started });
    return true;
  }

  if (parts[3] === 'action' && req.method === 'POST') {
    const body = await readBody(req);
    const seatIndex = match.seatFor(body.token);
    if (seatIndex < 0) {
      json(res, 403, { error: 'invalid session token' });
      return true;
    }
    if (!Number.isSafeInteger(body.expectedSeq) || body.expectedSeq !== match.seq) {
      json(res, 409, { error: 'state changed; refresh and try again', seq: match.seq });
      return true;
    }
    const seat = match.seats[seatIndex];
    const now = Date.now();
    if (now - seat.lastActionAt < 80) {
      json(res, 429, { error: 'actions are arriving too quickly' });
      return true;
    }
    const result = match.apply(seatIndex, body.action);
    if (!result.ok) {
      json(res, result.status || 400, { error: result.error });
      return true;
    }
    seat.lastActionAt = now;
    match.seq++;
    const entry = { seq: match.seq, seat: seatIndex, action: body.action };
    match.eventLog.push(entry);
    if (match.eventLog.length > 500) match.eventLog.shift();
    match.broadcast('match:event', entry);
    if (match.game.winner !== null) match.status = 'finished';
    match.broadcastState();
    if (match.status === 'finished') {
      match.broadcast('match:ended', { winner: match.game.winner, seq: match.seq });
    }
    json(res, 200, { ok: true, seq: match.seq });
    return true;
  }

  json(res, 404, { error: 'unknown api route' });
  return true;
}

export function cleanupMultiplayerMatches(now = Date.now()) {
  for (const [id, match] of matches) {
    if (now - match.lastActivity > MATCH_TTL_MS) {
      for (const seat of match.seats) {
        if (seat) for (const stream of seat.streams) stream.end();
      }
      matches.delete(id);
    }
  }
}
