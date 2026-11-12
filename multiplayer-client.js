import { starterDecks, factions } from './cards.js';

const $ = id => document.getElementById(id);
const app = $('app');
const SESSION_KEY = 'astracrown-online-session';
let matchId = null;
let token = null;
let seat = null;
let stream = null;
let snapshot = null;
let opponent = { joined: false, ready: false };
let selectedCard = null;
let selectedAttacker = null;
let roomDeckId = starterDecks[0].id;
let notice = '';
let busy = false;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]));

async function request(path, body) {
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function deckOptions(selected = starterDecks[0].id) {
  return starterDecks.map(deck => `<option value="${deck.id}" ${deck.id === selected ? 'selected' : ''}>${escapeHtml(factions[deck.faction].name)}</option>`).join('');
}

function showLobby() {
  app.innerHTML = `
    <section class="intro">
      <p class="eyebrow">THE ASTRAL ARENA</p>
      <h1>Two destinies.<br><em>One Crown.</em></h1>
      <p class="subcopy">Challenge another Starborne in a live, server-authoritative duel. Create a room or enter a six-character code.</p>
    </section>
    <section class="lobby-grid">
      <form class="panel" id="create-form">
        <span class="panel-mark">01 / HOST</span>
        <h2>Forge a room</h2>
        <label for="host-deck">Your faction</label>
        <select id="host-deck">${deckOptions()}</select>
        <button class="primary" type="submit">Create room <span>↗</span></button>
      </form>
      <form class="panel" id="join-form">
        <span class="panel-mark">02 / CHALLENGER</span>
        <h2>Join a duel</h2>
        <label for="join-deck">Your faction</label>
        <select id="join-deck">${deckOptions(starterDecks[1].id)}</select>
        <label for="room-code">Room code</label>
        <input id="room-code" autocomplete="off" maxlength="6" placeholder="E.G. 7KQ2WP" pattern="[A-Za-z0-9]{6}" required>
        <button class="secondary" type="submit">Enter arena <span>↗</span></button>
      </form>
    </section>
    <p class="notice" role="status">${escapeHtml(notice || 'Online duels use the six official starter decks. Your collection and solo progress stay untouched.')}</p>
    <p class="footnote">Both players must be connected to the same live game server. Share the room code with your opponent.</p>
  `;
  $('create-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const result = await request('/api/match', { deckId: $('host-deck').value });
      enter(result.matchId, result.token, result.seat);
    } catch (error) { notice = error.message; showLobby(); }
  });
  $('join-form').addEventListener('submit', async event => {
    event.preventDefault();
    const code = $('room-code').value.trim().toUpperCase();
    try {
      const result = await request(`/api/match/${encodeURIComponent(code)}/join`, { deckId: $('join-deck').value });
      enter(result.matchId, result.token, result.seat);
    } catch (error) { notice = error.message; showLobby(); }
  });
}

function saveSession() {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ matchId, token, seat })); } catch {}
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

async function enter(id, sessionToken, playerSeat) {
  matchId = id;
  token = sessionToken;
  seat = playerSeat;
  selectedCard = null;
  selectedAttacker = null;
  roomDeckId = starterDecks[playerSeat]?.id || starterDecks[0].id;
  saveSession();
  connect();
  await refreshState();
}

function connect() {
  if (stream) stream.close();
  stream = new EventSource(`/api/match/${encodeURIComponent(matchId)}/events?token=${encodeURIComponent(token)}`);
  stream.addEventListener('opponent:status', event => {
    opponent = JSON.parse(event.data);
    render();
  });
  stream.addEventListener('match:state', event => {
    snapshot = JSON.parse(event.data);
    if (snapshot.status === 'active' || snapshot.status === 'finished') selectedCard = null;
    render();
  });
  stream.addEventListener('match:event', event => {
    const data = JSON.parse(event.data);
    if (data.action) notice = `Player ${data.seat + 1} confirmed an action: ${data.action.type.replaceAll('_', ' ').toLowerCase()}.`;
    render();
  });
  stream.addEventListener('match:ended', event => {
    const data = JSON.parse(event.data);
    notice = data.winner === seat ? 'Victory. The Crown answers your call.' : 'Defeat. The next challenge awaits.';
    render();
  });
  stream.onerror = () => {
    notice = 'Connection interrupted. Reconnecting automatically…';
    render();
  };
}

async function refreshState() {
  if (!matchId || !token) return;
  try {
    snapshot = await request(`/api/match/${encodeURIComponent(matchId)}/state?token=${encodeURIComponent(token)}`);
    render();
  } catch (error) {
    notice = error.message;
    render();
  }
}

async function act(action) {
  if (busy || !snapshot || snapshot.status !== 'active') return;
  busy = true;
  try {
    await request(`/api/match/${encodeURIComponent(matchId)}/action`, {
      token, expectedSeq: snapshot.seq, action,
    });
    await refreshState();
    notice = '';
  } catch (error) {
    notice = error.message;
    await refreshState();
  } finally {
    busy = false;
    render();
  }
}

async function ready() {
  if (busy) return;
  busy = true;
  try {
    const deckId = roomDeckId;
    const result = await request(`/api/match/${encodeURIComponent(matchId)}/ready`, { token, deckId });
    notice = result.started ? 'Both challengers are ready. The duel begins!' : 'You are ready. Waiting for your opponent…';
    await refreshState();
  } catch (error) {
    notice = error.message;
  } finally {
    busy = false;
    render();
  }
}

function playerLabel(index) {
  return index === seat ? 'YOU' : 'OPPONENT';
}

function cardMarkup(card, index, zone, slot, mine) {
  if (!card) {
    if (mine && snapshot?.status === 'active' && snapshot.activePlayer === seat &&
        snapshot.phase === 'main' && selectedCard !== null) {
      const selected = snapshot.players[seat].hand[selectedCard];
      if (selected?.type === 'Unit') {
        return `<button class="unit-slot open-slot" data-play-zone="${zone}" data-slot="${slot}">＋<small>Deploy here</small></button>`;
      }
    }
    return '<div class="unit-slot empty-slot"><span>◇</span><small>OPEN FORMATION</small></div>';
  }
  const canSelect = mine && snapshot?.status === 'active' && snapshot.activePlayer === seat;
  const isSelected = selectedAttacker === card.uid;
  const targetable = !mine && selectedAttacker !== null;
  const classes = ['unit-card', card.exhausted ? 'exhausted' : '', isSelected ? 'selected' : '', targetable ? 'targetable' : ''].filter(Boolean).join(' ');
  const attrs = mine && canSelect && snapshot.phase === 'battle'
    ? `data-attacker="${escapeHtml(card.uid)}"`
    : targetable ? `data-target="${escapeHtml(card.uid)}"` : '';
  return `<button class="${classes}" ${attrs} style="--f:${escapeHtml(factions[card.faction]?.tone || '#c8a56a')}">
    <span class="unit-cost">${card.cost}</span><b>${escapeHtml(card.name)}</b>
    <strong>${Number(card.power || 0).toLocaleString()} PWR</strong>
    <small>${escapeHtml(card.keyword || card.type)} ${card.exhausted ? '· EXHAUSTED' : ''}</small>
  </button>`;
}

function leaderMarkup(player, index) {
  const faction = factions[player.leader.faction];
  const mine = index === seat;
  const target = !mine && selectedAttacker !== null ? 'data-target="leader"' : '';
  return `<section class="leader ${mine ? 'mine' : 'enemy'}" style="--f:${faction.tone}" ${target}>
    <div class="leader-sigil">${faction.mark}</div>
    <div class="leader-copy"><small>${mine ? 'YOUR LEADER' : 'RIVAL LEADER'} · ${escapeHtml(faction.name)}</small>
      <b>${escapeHtml(player.leader.name)}</b><span>${escapeHtml(player.leader.stages[player.stage].name)} · ${Number(player.leader.power + (player.leader.tempPower || 0)).toLocaleString()} PWR</span>
    </div>
    <div class="damage"><b>${player.damage}/6</b><small>DAMAGE</small></div>
    <div class="health-track"><i style="width:${Math.min(100, player.damage / 6 * 100)}%"></i></div>
  </section>`;
}

function boardSide(player, index) {
  const mine = index === seat;
  const label = playerLabel(index);
  const field = zone => player[zone].map((card, slot) => cardMarkup(card, index, zone, slot, mine)).join('');
  return `<section class="side ${mine ? 'my-side' : 'opponent-side'}">
    <div class="side-heading"><span>${label}</span><span>DECK ${player.deck.length} · HAND ${player.hand.length}</span></div>
    ${leaderMarkup(player, index)}
    <div class="formation-label">FRONTLINE</div><div class="formation">${field('front')}</div>
    <div class="formation-label">SUPPORT</div><div class="formation">${field('support')}</div>
  </section>`;
}

function canAscendNow(player) {
  const gates = [0, 2, 4, 6];
  return player.stage < 3 && player.turns >= gates[player.stage + 1] && player.aether >= player.stage + 1;
}

function battleScreen() {
  if (!snapshot?.players) return roomScreen();
  const me = snapshot.players[seat];
  const enemy = snapshot.players[1 - seat];
  const myTurn = snapshot.activePlayer === seat && snapshot.status === 'active';
  const phaseNames = { draw: 'DRAW', ascension: 'ASCENSION', main: 'MAIN PHASE', battle: 'BATTLE PHASE', end: 'END TURN' };
  const hand = me.hand.map((card, index) => {
    const hidden = card.hidden;
    const selected = selectedCard === index;
    const disabled = !myTurn || snapshot.phase !== 'main' || hidden || card.cost > me.aether;
    return `<button class="hand-card ${selected ? 'selected' : ''}" data-hand="${index}" ${disabled ? 'disabled' : ''}>
      <span class="hand-cost">${hidden ? '✦' : card.cost}</span>
      <b>${hidden ? 'Hidden card' : escapeHtml(card.name)}</b>
      <small>${hidden ? 'Your opponent keeps their hand secret' : escapeHtml(card.rarity + ' · ' + card.type)}</small>
      <span>${hidden ? '' : escapeHtml(card.ability || card.keyword || 'A card from your deck.')}</span>
    </button>`;
  }).join('');
  const logs = snapshot.log.slice(0, 5).map(line => `<li>${escapeHtml(line)}</li>`).join('');
  const result = snapshot.status === 'finished'
    ? `<div class="result"><b>${snapshot.winner === seat ? 'VICTORY' : 'DEFEAT'}</b><span>${snapshot.winner === seat ? 'The Crown is yours.' : 'The stars will align again.'}</span></div>`
    : '';
  return `
    <div class="match-heading"><div><p class="eyebrow">ONLINE MATCH</p><h1>ROOM <em>${matchId}</em></h1></div><div class="turn-pill"><span class="${myTurn ? 'live' : ''}"></span>${myTurn ? 'YOUR TURN' : 'OPPONENT TURN'}<small>TURN ${snapshot.turn} · ${phaseNames[snapshot.phase] || snapshot.phase}</small></div></div>
    <section class="arena">
      ${boardSide(enemy, 1 - seat)}
      <div class="arena-divider"><span>✦</span><i></i><small>ASTRAL CONVERGENCE</small><i></i><span>✦</span></div>
      ${boardSide(me, seat)}
    </section>
    <section class="command-panel">
      <div class="resources"><span><b>${me.aether}</b> / ${me.maxAether}<small>AETHER</small></span><span><b>${me.deck.length}</b><small>DECK</small></span><span><b>${me.discard.length}</b><small>DISCARD</small></span></div>
      <div class="commands">
        <button class="secondary" data-action="ascend" ${!myTurn || snapshot.phase !== 'ascension' || !canAscendNow(me) ? 'disabled' : ''}>Ascend Leader</button>
        <button class="secondary" data-action="signature" ${!myTurn || snapshot.phase !== 'main' || me.stage !== 3 || me.aether < 2 || me.once.signature ? 'disabled' : ''}>Sovereign Signature</button>
        <button class="primary" data-action="advance" ${!myTurn || busy ? 'disabled' : ''}>${snapshot.phase === 'end' ? 'End turn' : snapshot.phase === 'battle' ? 'Finish battle' : 'Advance phase'} <span>↗</span></button>
      </div>
      <p class="notice" role="status">${escapeHtml(notice || (myTurn ? 'Choose your next move, Starborne.' : 'The rival is taking their turn.'))}</p>
    </section>
    <section class="hand-panel"><div class="hand-heading"><b>YOUR HAND</b><span>${me.hand.length} / 7 CARDS</span></div><div class="hand">${hand || '<p class="empty-hand">Your hand is empty.</p>'}</div></section>
    <section class="battle-log"><b>CHRONICLE</b><ol>${logs}</ol></section>
    ${result}
    <div class="match-footer"><span>CONFIRMED STATE · SEQUENCE ${snapshot.seq}</span><button class="text-button" data-action="exit">Leave match</button></div>
  `;
}

function roomScreen() {
  return `
    <section class="room-panel">
      <p class="eyebrow">THE ARENA IS FORMED</p>
      <h1>ROOM <em>${escapeHtml(matchId)}</em></h1>
      <p class="subcopy">Share this code with your challenger. The duel begins when both players are ready.</p>
      <div class="room-code"><b>${escapeHtml(matchId)}</b><button data-action="copy">Copy code</button></div>
      <div class="room-status"><span class="${opponent.joined ? 'live' : ''}"></span><b>${opponent.joined ? 'Opponent connected' : 'Waiting for opponent…'}</b><small>${opponent.ready ? 'Your opponent is ready.' : opponent.joined ? 'Your opponent is choosing a deck.' : 'A second Starborne must join this room.'}</small></div>
      <label for="room-deck">Your starter deck</label>
      <select id="room-deck" ${snapshot?.status !== 'waiting' ? 'disabled' : ''}>${deckOptions(roomDeckId)}</select>
      <button class="primary" data-action="ready" ${busy || !opponent.joined ? 'disabled' : ''}>I'm ready <span>↗</span></button>
      <p class="notice" role="status">${escapeHtml(notice || 'You can change your deck until the match starts.')}</p>
      <button class="text-button" data-action="exit">Leave room</button>
    </section>
  `;
}

function render() {
  if (!matchId) return showLobby();
  if (snapshot?.players && (snapshot.status === 'active' || snapshot.status === 'finished')) {
    app.innerHTML = battleScreen();
    return;
  }
  app.innerHTML = roomScreen();
}

app.addEventListener('change', event => {
  if (event.target.id === 'room-deck') roomDeckId = event.target.value;
});

app.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) {
    const target = event.target.closest('[data-target]');
    if (target && selectedAttacker) {
      await act({ type: 'ATTACK', attackerUid: selectedAttacker, target: target.dataset.target });
      selectedAttacker = null;
    }
    return;
  }
  if (button.dataset.action === 'ready') return ready();
  if (button.dataset.action === 'advance') return act({ type: 'ADVANCE_PHASE' });
  if (button.dataset.action === 'ascend') return act({ type: 'ASCEND' });
  if (button.dataset.action === 'signature') return act({ type: 'SIGNATURE' });
  if (button.dataset.action === 'copy') {
    try { await navigator.clipboard.writeText(matchId); notice = 'Room code copied.'; } catch { notice = 'Room code: ' + matchId; }
    return render();
  }
  if (button.dataset.action === 'exit') {
    if (stream) stream.close();
    clearSession();
    matchId = null; token = null; seat = null; snapshot = null; opponent = { joined: false, ready: false };
    notice = '';
    return render();
  }
  if (button.dataset.playZone) {
    const handIndex = selectedCard;
    const zone = button.dataset.playZone;
    const slot = Number(button.dataset.slot);
    selectedCard = null;
    return act({ type: 'PLAY_CARD', handIndex, zone, slot });
  }
  if (button.dataset.attacker) {
    selectedAttacker = selectedAttacker === button.dataset.attacker ? null : button.dataset.attacker;
    notice = selectedAttacker ? 'Choose an enemy unit or the opposing Leader to attack.' : '';
    return render();
  }
  if (button.dataset.target && selectedAttacker) {
    const attackerUid = selectedAttacker;
    selectedAttacker = null;
    return act({ type: 'ATTACK', attackerUid, target: button.dataset.target });
  }
  if (button.dataset.hand !== undefined) {
    const index = Number(button.dataset.hand);
    const card = snapshot?.players?.[seat]?.hand[index];
    if (!card || card.hidden) return;
    if (card.type === 'Unit') {
      selectedCard = selectedCard === index ? null : index;
      notice = selectedCard === null ? '' : 'Choose an open Frontline or Support position.';
      return render();
    }
    selectedCard = null;
    return act({ type: 'PLAY_CARD', handIndex: index, zone: 'front', slot: 0 });
  }
});

async function restoreSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (!saved?.matchId || !saved?.token || !Number.isInteger(saved.seat)) return showLobby();
    await enter(saved.matchId, saved.token, saved.seat);
  } catch {
    clearSession();
    showLobby();
  }
}

restoreSession();
