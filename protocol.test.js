import test from 'node:test';
import assert from 'node:assert/strict';
import {createActionEnvelope,validateActionEnvelope,createSnapshotEnvelope,PROTOCOL_VERSION} from '../src/network/protocol.js';

test('action envelope is versioned and validates legal action types',()=>{
 const msg=createActionEnvelope({matchId:'match-1',playerId:'p1',sequence:1,action:{type:'ATTACK',attackerId:'u-1',target:'leader'}});
 assert.equal(msg.protocolVersion,PROTOCOL_VERSION);assert.equal(validateActionEnvelope(msg).valid,true);
});
test('malformed sequence values and unknown actions are rejected',()=>{
 assert.equal(validateActionEnvelope({protocolVersion:PROTOCOL_VERSION,matchId:'m',playerId:'p',sequence:0,action:{type:'ATTACK'}}).valid,false);
 assert.equal(validateActionEnvelope({protocolVersion:PROTOCOL_VERSION,matchId:'m',playerId:'p',sequence:1,action:{type:'CHEAT'}}).valid,false);
});
test('snapshot envelope clones its payload and carries sequence metadata',()=>{
 const snapshot={turn:3,phase:'main'};const msg=createSnapshotEnvelope({matchId:'m',sequence:8,stateHash:'sha256:abc',snapshot});snapshot.turn=4;assert.equal(msg.snapshot.turn,3);assert.equal(msg.sequence,8);
});
