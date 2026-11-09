export const factions = {
  solar:{name:'Solar Dominion',mark:'☼',tone:'#f3a94b',style:'Radiant legionnaires who turn momentum into overwhelming force.',strength:'Explosive attacks · Rally buffs',weakness:'Card economy · Long defenses'},
  umbral:{name:'Umbral Covenant',mark:'◐',tone:'#a88be9',style:'Patient hex-weavers who dismantle enemy formations.',strength:'Debuffs · Disruption',weakness:'Fragile units · Slow starts'},
  verdant:{name:'Verdant Requiem',mark:'❋',tone:'#77c99b',style:'Symbiotic guardians who grow stronger together.',strength:'Healing · Formation synergy',weakness:'Burst damage · Removal'},
  draconic:{name:'Draconic Imperium',mark:'♢',tone:'#e47765',style:'Ancient wyrms who bank power for devastating turns.',strength:'High power · Overdrive',weakness:'Expensive curve · Tempo'},
  celestial:{name:'Celestial Archive',mark:'✧',tone:'#79bce9',style:'Foresight scholars who sculpt hands and future turns.',strength:'Draw · Aether control',weakness:'Low raw stats · Setup'},
  phantom:{name:'Phantom Legion',mark:'✥',tone:'#d58ac6',style:'Unquiet champions who trade bodies for impossible tempo.',strength:'Recursion · Sacrifice',weakness:'Self-damage · Board reliance'}
};
const leaders = [
 ['solar','Aurelia, Dawnforged Regent','Sunsteel Sovereign','Aurelia','Solar Dominion',5600,'At Stage 1, your first unit each turn gains +500 power.','At Stage 3, once per turn spend 2 Aether: give your front row +2000 power this turn.'],
 ['umbral','Veyra, the Hollow Crown','Nightfall Matriarch','Veyra','Umbral Covenant',5300,'When you ascend, weaken an enemy unit by 1000 power.','At Stage 3, once per turn spend 2 Aether: exhaust an enemy unit.'],
 ['verdant','Sylvaris, Heart of the Wild','Worldroot Avatar','Sylvaris','Verdant Requiem',5400,'When you ascend, if you have 3 or more units and 3 or more damage, heal 1 damage.','At Stage 3, once per turn spend 2 Aether: heal 1 damage (once per game).'],
 ['draconic','Rhazak, Calamity Unbound','Elder Flame Tyrant','Rhazak','Draconic Imperium',6000,'When you ascend, this Leader gains +1000 power this turn.','At Stage 3, once per turn spend 2 Aether: gain +3000 power this turn.'],
 ['celestial','Ilyon, Keeper of the Ninth','Astral Grand Scribe','Ilyon','Celestial Archive',5200,'When you ascend, draw 1 card.','At Stage 3, once per turn spend 2 Aether: look at the top 2 cards, keep one and place the other on the bottom.'],
 ['phantom','Morrigan, Last Procession','Eclipse Revenant','Morrigan','Phantom Legion',5500,'When you ascend, you may return a Common unit from discard to hand.','At Stage 3, once per turn spend 2 Aether: return a unit costing 2 or less from discard to a support zone exhausted.']
];
export const leadersData = leaders.map(([faction,name,epithet,short,factionName,power,stage1,stage3],i)=>({id:`leader-${faction}`,name,epithet,short,faction,factionName,type:'Leader',rarity:'Legendary',level:0,power,cost:0,ability:stage1,signature:stage3,stages:[{name:'Initiate',power},{name:'Awakened',power:power+500},{name:'Ascendant',power:power+1000},{name:'Sovereign',power:power+1500}],art:`${short} • ${epithet}`,copies:1}));
const prefixes={solar:['Sunblade','Dawnwatch','Emberlance','Radiant','Goldcrest','Helio'],umbral:['Gloam','Nightveil','Duskbound','Hollow','Gravewhisper','Shade'],verdant:['Thorn','Mossheart','Bloomguard','Rootwarden','Wildsong','Briar'],draconic:['Ashwing','Cindermaw','Stormscale','Furnace','Wyrmclaw','Scorch'],celestial:['Starweaver','Runesight','Aetherglass','Astral','Comet','Scriptor'],phantom:['Wraith','Gravesong','Pale','Soulchain','Dreadmarch','Hollowstep']};
const roles=['Vanguard','Sentinel','Lancer','Seer','Warden'];
const unitAbilities={solar:[['Rally','When this unit is summoned, another allied Frontline unit gets +500 power this turn.'],['Overdrive','When summoned, spend 1 Aether if able: this unit gains +1500 power this turn.'],['Domination','When this unit defeats a unit, gain 1 Aether up to your maximum (once per turn).']],umbral:[['Hex','When summoned, an enemy unit gets -1000 power this turn.'],['Bind','When this attacks, the target gets -500 power until end of turn.'],['Veil','The first time this unit is targeted each turn, it gets +1000 power.']],verdant:[['Resonance','If this has an adjacent allied unit, it gets +1000 power.'],['Rebirth','When destroyed, if you have 1 Aether, spend it to return this unit to your hand.'],['Bloom','When summoned, if you have 3 or more units and 3 or more damage, heal 1 damage (once per game).']],draconic:[['Overdrive','When summoned, spend 1 Aether if able: this unit gains +2000 power this turn.'],['Scorch','When summoned, deal 500 damage to an enemy unit.'],['Domination','When this defeats a unit, it gets +1000 power this turn.']],celestial:[['Scry','When summoned, put the top card of your deck on the bottom if it is a Spell or Relic.'],['Insight','When this attacks, if you have 2 or less cards in hand, draw 1.'],['Aethercraft','When summoned, gain 1 Aether (up to your maximum).']],phantom:[['Afterimage','When this attacks, draw 1 card after combat.'],['Rebirth','When destroyed, if you have 1 Aether, spend it to return this unit to your hand.'],['Last Stand','If you have 4 or more damage, this unit gets +1500 power.']]};
export const cardDatabase=[...leadersData];
for(const faction of Object.keys(factions)){
  for(let i=0;i<30;i++){
    const tier=i<10?0:i<18?1:i<24?2:i<28?3:4;
    const rarity=['Common','Uncommon','Rare','Super Rare','Ultra Rare'][tier];
    const level=1+(i%3);
    const power=3000+((i*137)%7)*500;
    const [keyword,ability]=unitAbilities[faction][i%3];
    const name=`${prefixes[faction][i%6]} ${roles[i%5]} ${String.fromCharCode(65+Math.floor(i/6))}`;
    cardDatabase.push({id:`${faction}-unit-${i+1}`,name,faction,factionName:factions[faction].name,type:'Unit',rarity,level,power,cost:level,keyword,ability,art:`${factions[faction].mark} ${name}`,copies:4});
  }
  for(let i=0;i<5;i++){
    const kind=['Spell','Spell','Relic','Trigger','Trigger'][i];
    const trigger=['Power','Critical','Draw','Shield','Heal'][i];
    const defs={solar:[['Solar Flare','Your lowest-power unit gains +2000 power this turn.'],['March of the First Light','Give two allied units +1000 power this turn.'],['Crown of Cinders','Your Frontline units gain +500 power while attacking.'],['Dawn Surge','Shield Trigger: prevent this damage and give your Leader +2000 power until the end of your next turn.'],['Phoenix Oath','Heal Trigger: remove 1 damage if you have 3 or more damage.'] ],umbral:[['Grasping Gloom','An enemy unit gets -2000 power this turn.'],['Veil of Silence','Exhaust an enemy unit with 4000 power or less.'],['Obsidian Seal','Your Frontline units gain +1000 power while defending.'],['Nightfall Edict','Shield Trigger: prevent this damage and give your Leader +2000 power until the end of your next turn.'],['Pale Reprieve','Heal Trigger: remove 1 damage if you have 3 or more damage.']],verdant:[['Verdant Renewal','Heal 1 damage if you have 3 or more damage.'],['Thornbind','An enemy unit gets -1000 power this turn and cannot attack next turn.'],['Seed of Eternity','Your highest-power unit gains +500 power. When it is destroyed, draw 1 card.'],['Wildheart Bloom','Shield Trigger: prevent this damage and give your Leader +2000 power until the end of your next turn.'],['Spring Returns','Heal Trigger: remove 1 damage if you have 3 or more damage.']],draconic:[['Cataclysm Breath','Deal 1500 damage to an enemy unit.'],['Molten Core','Gain 2 Aether up to your maximum.'],['Scale of the First Wyrm','Your Frontline units gain +1500 power while attacking.'],['Inferno Break','Shield Trigger: prevent this damage and give your Leader +2000 power until the end of your next turn.'],['Ashen Rebirth','Heal Trigger: remove 1 damage if you have 3 or more damage.']],celestial:[['Archive of Tomorrows','Draw 2 cards, then put 1 card from your hand on the bottom of your deck.'],['Aether Reversal','Gain 2 Aether up to your maximum.'],['Lens of the Ninth Sky','When you summon a unit, put the top card of your deck on the bottom if it is a Spell or Relic.'],['Foresight Pulse','Shield Trigger: prevent this damage and give your Leader +2000 power until the end of your next turn.'],['Starlit Mercy','Heal Trigger: remove 1 damage if you have 3 or more damage.']],phantom:[['Borrowed Breath','Return a Common unit from discard to your hand.'],['Grave Toll','Destroy an allied unit to draw 2 cards.'],['Chain of the Departed','Your highest-power unit gains +1000 power. When it is destroyed, return it to your hand.'],['Midnight Echo','Shield Trigger: prevent this damage and give your Leader +2000 power until the end of your next turn.'],['Quietus Denied','Heal Trigger: remove 1 damage if you have 3 or more damage.']]};
    const [name,ability]=defs[faction][i];
    cardDatabase.push({id:`${faction}-${kind.toLowerCase()}-${i+1}`,name,faction,factionName:factions[faction].name,type:kind,rarity:i===2?'Rare':i===3||i===4?'Uncommon':'Common',level:0,power:0,cost:kind==='Trigger'?0:i===2?2:1,ability,trigger:kind==='Trigger'?trigger:null,art:`${factions[faction].mark} ${name}`,copies:4});
  }
  const extraTriggers=[['Critical','Critical','When revealed, your next successful Leader attack this turn deals +1 damage.'],['Draw','Draw','When revealed, draw 1 card.'],['Power','Power','When revealed, give your strongest unit +2000 power this turn.']];
  for(let i=0;i<extraTriggers.length;i++){const [key,trigger,ability]=extraTriggers[i];cardDatabase.push({id:`${faction}-trigger-${key.toLowerCase()}`,name:`${prefixes[faction][i]} ${key} Sigil`,faction,factionName:factions[faction].name,type:'Trigger',rarity:'Uncommon',level:0,power:0,cost:0,ability,trigger,art:`${factions[faction].mark} ${key} Sigil`,copies:4});}
  cardDatabase.push({id:`${faction}-unit-legendary`,name:`${prefixes[faction][0]} Paragon`,faction,factionName:factions[faction].name,type:'Unit',rarity:'Legendary',level:2,power:5000,cost:2,keyword:unitAbilities[faction][0][0],ability:unitAbilities[faction][0][1],art:`${factions[faction].mark} ${prefixes[faction][0]} Paragon`,copies:4});
  cardDatabase.push({id:`${faction}-unit-mythic`,name:`${prefixes[faction][1]} Mythkeeper`,faction,factionName:factions[faction].name,type:'Unit',rarity:'Mythic',level:1,power:3500,cost:1,keyword:unitAbilities[faction][1][0],ability:unitAbilities[faction][1][1],art:`${factions[faction].mark} ${prefixes[faction][1]} Mythkeeper`,copies:4});
}
export const getCard=id=>cardDatabase.find(c=>c.id===id);
export function starterDeck(faction){
 const pool=cardDatabase.filter(c=>c.faction===faction&&c.type!=='Leader');
 const deck=[];
 // 30 units + 10 spells/relics + 10 triggers, with four-copy cap.
 const units=pool.filter(c=>c.type==='Unit'), tactics=pool.filter(c=>c.type==='Spell'||c.type==='Relic'), triggers=pool.filter(c=>c.type==='Trigger');
 for(let i=0;i<30;i++)deck.push(units[i%units.length].id);
 for(let i=0;i<10;i++)deck.push(tactics[i%tactics.length].id);
 for(let i=0;i<10;i++)deck.push(triggers[i%triggers.length].id);
 // Reduce repeated ids to legal four copies by cycling distinct cards.
 const counts={};
 for(let i=0;i<deck.length;i++){const id=deck[i];counts[id]=(counts[id]||0)+1;if(counts[id]>4){const group=pool.filter(c=>c.type===getCard(id).type);deck[i]=group.find(c=>(counts[c.id]||0)<4&&c.id!==id)?.id||id;counts[deck[i]]=(counts[deck[i]]||0)+1;}}
 return deck;
}
export const starterDecks=Object.keys(factions).map(f=>({id:`starter-${f}`,name:`${factions[f].name} • First Light`,faction:f,leader:`leader-${f}`,cards:starterDeck(f)}));
