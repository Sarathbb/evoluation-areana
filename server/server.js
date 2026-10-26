'use strict';
/* Evolution Arena multiplayer server.
   It loads the game's own script (../index.html) in a sandbox and runs it headlessly as the one
   authoritative simulation. Clients send inputs and receive snapshots; they never run the game logic. */
const http=require('http'),fs=require('fs'),path=require('path'),vm=require('vm');
const {WebSocketServer}=require('ws');
const PORT=+process.env.PORT||8080,MAX_PLAYERS=+process.env.MAX_PLAYERS||30,TICK=30,SNAP_EVERY=2;
const htmlPath=path.join(__dirname,'..','index.html');

function dummy(){const f=function(){};const p=new Proxy(f,{get:(t,k)=>{if(k===Symbol.toPrimitive)return()=>0;if(k==='then')return undefined;return p},apply:()=>p,construct:()=>p,set:()=>true,has:()=>true});return p}
function loadGame(){
 const html=fs.readFileSync(htmlPath,'utf8');
 const src=html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>'));
 const D=dummy();
 const sb={console,setTimeout,clearTimeout,setInterval,clearInterval,performance:{now:()=>Date.now()},
  document:{getElementById:()=>D,createElement:()=>D,addEventListener(){},querySelector:()=>D,body:D,hidden:false},
  navigator:{maxTouchPoints:0},innerWidth:1280,innerHeight:720,devicePixelRatio:1,addEventListener(){},requestAnimationFrame(){},
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},location:{href:'http://localhost/'}};
 sb.window=sb;vm.createContext(sb);
 vm.runInContext(src,sb,{filename:'game.js'});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'glue.js'),'utf8'),sb,{filename:'glue.js'});
 return sb.__api;
}
const api=loadGame();
const players=new Map();
const send=(st,m)=>{if(st.ws.readyState===1)st.ws.send(typeof m==='string'?m:JSON.stringify(m))};

const server=http.createServer((req,res)=>{
 const url=req.url.split('?')[0];
 if(url==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(Object.assign({ok:true,max:MAX_PLAYERS},api.stats())));return}
 if(url==='/'||url==='/index.html'){fs.readFile(htmlPath,(e,b)=>{if(e){res.writeHead(500);res.end('game file missing');return}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(b)});return}
 res.writeHead(404);res.end('Not found');
});
const wss=new WebSocketServer({server,maxPayload:4096});
wss.on('connection',ws=>{
 const st={ws,id:0,known:new Set(),cv:{},mmT:0,msgs:0,alive:true};ws._st=st;
 ws.on('pong',()=>{st.alive=true});
 ws.on('message',buf=>{
  if(++st.msgs>90)return;
  let m;try{m=JSON.parse(buf.toString())}catch(e){return}
  if(!m||typeof m.t!=='string')return;
  if(m.t==='join'){
   if(st.id)return;
   if(players.size>=MAX_PLAYERS){send(st,{t:'full',max:MAX_PLAYERS});return}
   st.id=api.join(m.name,m.skin,m.plate);st.known.clear();st.cv={};st.mmT=0;players.set(st.id,st);send(st,api.welcome(st.id));return}
  if(!st.id)return;
  if(m.t==='in')api.input(st.id,m.x,m.y,m.a);
  else if(m.t==='ab'&&typeof m.k==='string')api.ability(st.id,m.k,m.a);
  else if(m.t==='em')api.emote(st.id,m.e);
  else if(m.t==='leave'){const d=api.retire(st.id);players.delete(st.id);st.id=0;if(d)send(st,Object.assign({t:'dead'},d))}
 });
 ws.on('close',()=>{if(st.id){api.leave(st.id);players.delete(st.id);st.id=0}});
 ws.on('error',()=>{});
});
setInterval(()=>{for(const ws of wss.clients)if(ws._st)ws._st.msgs=0},1000);
setInterval(()=>{for(const st of players.values())if(!st.alive){st.ws.terminate()}else{st.alive=false;try{st.ws.ping()}catch(e){}}},15000);

let tickN=0,slow=0;
setInterval(()=>{
 const t0=process.hrtime.bigint();
 let deaths;try{deaths=api.tick(1/TICK)}catch(e){console.error('tick error',e);return}
 for(const d of deaths){const st=players.get(d.id);if(st){send(st,Object.assign({t:'dead'},d));players.delete(d.id);st.id=0;st.known.clear();st.cv={}}}
 if(++tickN%SNAP_EVERY===0){
  for(const [id,st] of players){const c=api.byId(id);if(c)send(st,api.snapshot(c,st))}
  api.clearEvents()}
 const ms=Number(process.hrtime.bigint()-t0)/1e6;if(ms>25&&++slow%50===1)console.warn('slow tick',ms.toFixed(1)+'ms','players',players.size);
},1000/TICK);
server.listen(PORT,()=>console.log(`Evolution Arena server on :${PORT}  (max ${MAX_PLAYERS} players)  http://localhost:${PORT}/`));
