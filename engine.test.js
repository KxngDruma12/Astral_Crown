import test from 'node:test';
import assert from 'node:assert/strict';
import {starterDecks,cardDatabase,getCard} from './cards.js';
import {createGame,validateDeck,advancePhase,current,opponent,canAscend,ascend,playCard,attack,allUnits,draw,heal,effectiveUnitPower} from '../src/engine.js';

test('six faction starter decks are legal 50-card lists',()=>{
 assert.equal(starterDecks.length,6);
 for(const deck of starterDecks){assert.equal(deck.cards.length,50);assert.equal(validateDeck(deck).valid,true,`${deck.name}: ${validateDeck(deck).errors.join(', ')}`);}
});
test('catalogue contains six Leaders and the five trigger categories for each faction',()=>{
 assert.equal(cardDatabase.filter(c=>c.type==='Leader').length,6);
 for(const deck of starterDecks){const triggers=cardDatabase.filter(c=>c.faction===deck.faction&&c.type==='Trigger');assert.deepEqual(new Set(triggers.map(c=>c.trigger)),new Set(['Power','Critical','Draw','Shield','Heal']));}
});
test('battle setup deals five cards and starts with one Aether',()=>{
 const g=createGame(starterDecks[0],starterDecks[1]);
 for(const p of g.players){assert.equal(p.hand.length,5);assert.equal(p.deck.length,45);assert.equal(p.aether,1);assert.equal(p.damage,0);assert.equal(p.stage,0);}
});
test('first player skips first draw and maximum Aether grows at refresh',()=>{
 const g=createGame(starterDecks[0],starterDecks[1]);const p=current(g);advancePhase(g);assert.equal(g.phase,'draw');advancePhase(g);assert.equal(p.hand.length,5);assert.equal(g.phase,'ascension');advancePhase(g);advancePhase(g);advancePhase(g);assert.equal(g.phase,'end');advancePhase(g);const rival=current(g);assert.equal(rival.id,'rival');assert.equal(rival.maxAether,1);assert.equal(rival.hand.length,6);advancePhase(g);advancePhase(g);advancePhase(g);advancePhase(g);const nextHuman=current(g);assert.equal(nextHuman.id,'you');assert.equal(nextHuman.maxAether,2);});
test('Ascension follows turn gates and spends destination-stage Aether',()=>{
 const g=createGame(starterDecks[0],starterDecks[1]),p=current(g);p.turns=2;p.aether=2;g.phase='ascension';assert.equal(canAscend(p),true);assert.equal(ascend(g),true);assert.equal(p.stage,1);assert.equal(p.aether,1);});
test('healing only works at three or more damage',()=>{
 const g=createGame(starterDecks[0],starterDecks[1]),p=current(g);p.damage=2;assert.equal(heal(p,g),false);assert.equal(p.damage,2);p.damage=3;assert.equal(heal(p,g),true);assert.equal(p.damage,2);});
test('a unit can be summoned from hand and spends its printed cost',()=>{
 const g=createGame(starterDecks[0],starterDecks[1]),p=current(g);advancePhase(g);advancePhase(g);advancePhase(g);p.aether=10;p.hand=[structuredClone(getCard('solar-unit-1'))];const unitIndex=0;const card=p.hand[unitIndex],cost=card.cost;const result=playCard(g,unitIndex,'front',0);assert.equal(result.ok,true);assert.equal(p.front[0].name,card.name);assert.equal(p.aether,10-cost);});
test('deck validation rejects a 49-card deck and duplicate overflow',()=>{
 const d=structuredClone(starterDecks[0]);d.cards.pop();assert.equal(validateDeck(d).valid,false);const d2=structuredClone(starterDecks[0]);const counts=d2.cards.reduce((a,id)=>(a[id]=(a[id]||0)+1,a),{});const over=Object.keys(counts).find(id=>counts[id]===4);const replace=d2.cards.findIndex(id=>id!==over);d2.cards[replace]=over;assert.equal(validateDeck(d2).valid,false);});

test('a revealed Shield Trigger prevents the damage and strengthens the Leader',()=>{
 const g=createGame(starterDecks[0],starterDecks[1]),p=current(g),e=opponent(g);
 const attacker=structuredClone(getCard('solar-unit-mythic'));attacker.uid='test-attacker';attacker.power=9000;p.front[0]=attacker;
 e.deck.unshift({...structuredClone(getCard('umbral-trigger-4')),uid:'test-trigger'});g.phase='battle';
 const result=attack(g,attacker.uid,'leader');assert.equal(result.hit,true);assert.equal(e.damage,0);assert.equal(e.leader.tempPower,2000);assert.equal(e.discard[0].trigger,'Shield');
});
test('a non-trigger revealed on a successful Leader hit causes one damage and enters hand',()=>{
 const g=createGame(starterDecks[0],starterDecks[1]),p=current(g),e=opponent(g);
 const attacker=structuredClone(getCard('solar-unit-mythic'));attacker.uid='test-attacker';attacker.power=9000;p.front[0]=attacker;
 const reveal={...structuredClone(getCard('solar-unit-1')),uid:'test-reveal'};e.deck.unshift(reveal);g.phase='battle';
 attack(g,attacker.uid,'leader');assert.equal(e.damage,1);assert.equal(e.hand.at(-1).uid,'test-reveal');
});
test('Sovereign Signature requires Stage 3 and two Aether, and is once per turn',async()=>{
 const {canActivateSignature,activateSignature}=await import('../src/engine.js');const g=createGame(starterDecks[0],starterDecks[1]),p=current(g);p.stage=3;p.aether=2;g.phase='main';assert.equal(canActivateSignature(p),true);assert.equal(activateSignature(g),true);assert.equal(p.aether,0);assert.equal(canActivateSignature(p),false);
});
test('the AI deploys and attacks through the same legal action functions',async()=>{
 const {aiChooseMove}=await import('../src/engine.js');const g=createGame(starterDecks[0],starterDecks[1]);g.active=1;const p=current(g);p.hand=[{...structuredClone(getCard('umbral-unit-1')),uid:'ai-card'}];p.aether=10;g.phase='main';assert.equal(aiChooseMove(g,'normal'),'play');assert.ok(p.front[0]);g.phase='battle';assert.equal(aiChooseMove(g,'normal'),'attack');assert.equal(p.front[0].exhausted,true);
});
test('catalogue has the requested minimum unit rarity counts',()=>{
 const units=cardDatabase.filter(c=>c.type==='Unit');const count=r=>units.filter(c=>c.rarity===r).length;
 assert.ok(count('Common')>=30);assert.ok(count('Uncommon')>=24);assert.ok(count('Rare')>=18);assert.ok(count('Super Rare')>=12);assert.ok(count('Ultra Rare')>=6);assert.ok(count('Legendary')>=6);assert.ok(count('Mythic')>=6);assert.ok(Math.max(...units.filter(c=>c.rarity==='Common').map(c=>c.power))>Math.max(...units.filter(c=>c.rarity==='Mythic').map(c=>c.power)));
});

test('six damage ends the battle immediately, including critical damage checks',()=>{
 const g=createGame(starterDecks[0],starterDecks[1]),p=current(g),e=opponent(g);
 const attacker=structuredClone(getCard('solar-unit-mythic'));attacker.uid='critical-attacker';attacker.power=9000;attacker.critical=5;p.front[0]=attacker;
 e.deck=Array.from({length:6},(_,i)=>({...structuredClone(getCard('solar-unit-1')),uid:`reveal-${i}`}));g.phase='battle';
 attack(g,attacker.uid,'leader');assert.equal(e.damage,6);assert.equal(g.winner,0);
});

test('frontline support and relics contribute to effective power',()=>{
 const g=createGame(starterDecks[0],starterDecks[1]),p=current(g);const unit={...structuredClone(getCard('solar-unit-1')),uid:'formed-unit'};p.front[0]=unit;p.support[0]={...structuredClone(getCard('solar-unit-2')),uid:'support-unit'};p.relic=structuredClone(getCard('solar-relic-3'));
 assert.equal(effectiveUnitPower(p,unit,'attack'),unit.power+500+500);
});

test('Easy prioritizes cheap deployment while Normal prioritizes board power',async()=>{
 const {aiChooseMove}=await import('../src/engine.js');
 const make=()=>{const g=createGame(starterDecks[0],starterDecks[1]);g.active=1;const p=current(g);p.stage=2;p.aether=10;p.hand=[{...structuredClone(getCard('solar-unit-1')),uid:'cheap'},{...structuredClone(getCard('solar-unit-6')),uid:'strong'}];g.phase='main';return {g,p};};
 const easy=make();aiChooseMove(easy.g,'easy');assert.equal(easy.p.front[0].id,'solar-unit-1');
 const normal=make();aiChooseMove(normal.g,'normal');assert.equal(normal.p.front[0].id,'solar-unit-6');
});
