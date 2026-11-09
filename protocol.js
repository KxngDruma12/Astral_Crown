export const PROTOCOL_VERSION=1;
const ACTION_TYPES=new Set(['PLAY_CARD','ASCEND','ATTACK','END_PHASE','SIGNATURE']);
export function createActionEnvelope({matchId,playerId,sequence,action}){
 if(typeof matchId!=='string'||!matchId.trim())throw new TypeError('matchId is required');
 if(typeof playerId!=='string'||!playerId.trim())throw new TypeError('playerId is required');
 if(!Number.isSafeInteger(sequence)||sequence<1)throw new TypeError('sequence must be a positive safe integer');
 if(!action||!ACTION_TYPES.has(action.type))throw new TypeError('unsupported action type');
 return {protocolVersion:PROTOCOL_VERSION,matchId,playerId,sequence,action:structuredClone(action)};
}
export function validateActionEnvelope(message){
 if(!message||message.protocolVersion!==PROTOCOL_VERSION)return {valid:false,error:'Unsupported protocol version.'};
 if(typeof message.matchId!=='string'||!message.matchId.trim())return {valid:false,error:'Missing match ID.'};
 if(typeof message.playerId!=='string'||!message.playerId.trim())return {valid:false,error:'Missing player ID.'};
 if(!Number.isSafeInteger(message.sequence)||message.sequence<1)return {valid:false,error:'Invalid action sequence.'};
 if(!message.action||!ACTION_TYPES.has(message.action.type))return {valid:false,error:'Unsupported action.'};
 return {valid:true};
}
export function createSnapshotEnvelope({matchId,sequence,stateHash,snapshot}){
 if(typeof matchId!=='string'||!matchId.trim())throw new TypeError('matchId is required');
 if(!Number.isSafeInteger(sequence)||sequence<0)throw new TypeError('sequence must be a non-negative safe integer');
 if(typeof stateHash!=='string'||!stateHash.trim())throw new TypeError('stateHash is required');
 return {protocolVersion:PROTOCOL_VERSION,kind:'STATE_SNAPSHOT',matchId,sequence,stateHash,snapshot:structuredClone(snapshot)};
}
