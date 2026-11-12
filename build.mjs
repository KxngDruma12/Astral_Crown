import {mkdir,rm,cp} from 'node:fs/promises';
const files=['index.html','main.js','engine.js','cards.js','protocol.js','style.css','multiplayer.html','multiplayer-client.js','multiplayer.css'];
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const file of files) await cp(file,`dist/${file}`);
console.log('Static production bundle written to dist/.');
