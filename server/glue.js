/* Runs inside the sandbox, after the game script has loaded. It turns the single-player game into a
   multi-player server: no DOM, no local player, and every visual/audio call becomes a network event. */
(function(){
'use strict';
const EV=[],MAXEV=300,r1=v=>Math.round(v*10)/10;
const ev=a=>{if(EV.length<MAXEV)EV.push(a)};
M.tut=1;M.settings.sound=false;M.settings.music=false;
/* ---- replace presentation functions with event recorders ---- */
sfx=function(){};toast=function(){};showEvo=function(){};buildAbar=function(){};setHint=function(){};
setBanner=function(t,ms){ev(['bn',t,ms||3000])};
feed=function(t){ev(['fd',t])};
burst=function(x,y,col,n,sp){ev(['bu',r1(x),r1(y),col,Math.min(n,30),sp])};
dust=function(x,y,n,sp,col){ev(['du',r1(x),r1(y),Math.min(n,20),sp,col||0])};
floaty=function(x,y,t,c){ev(['fl',r1(x),r1(y),t,c||'#fff'])};
addFx=function(k,x,y,o){o=o||{};ev(['fx',k,r1(x),r1(y),{r:o.r,life:o.life,col:o.col,a:o.a,n:o.n,w:o.w,glow:o.glow,t:o.t,seed:o.seed,own:o.own?o.own.id:0}])};
abSfx=function(c,key){ev(['ab',c.id,key])};
/* ---- start the shared arena, then take the local player out of it ---- */
startGame('arena');
const ghost=G.p;G.cre=G.cre.filter(c=>c!==ghost);ghost.dead=true;ghost.name='ghost';
G.online=true;G.t0=0;G.seed=Math.floor(Math.random()*1e9);
RNG=mulberry32(G.seed);genDeco();RNG=Math.random;
{const extra=G.cre.filter(c=>c.bot&&!c.boss).slice(__cfg.bots||60);for(const c of extra)c.dead=true;G.cre=G.cre.filter(c=>!c.dead)}
const PL={};
const COL=/^(#[0-9a-fA-F]{3,8}|hsla?\([0-9., %]+\)|rgba?\([0-9., %]+\))$/;
const PATS=['solid','stripes','dots','ring','glow'];
const EMOJI=['😀','😡','😭','👍','👑','🔥','💀','❤️','🤝','🎉'];
function cleanSkin(s){if(!s||typeof s!=='object')return null;const c1=String(s.c1||''),c2=String(s.c2||'');if(!COL.test(c1)||!COL.test(c2))return null;return{c1,c2,pat:PATS.indexOf(s.pat)>=0?s.pat:'solid',n:String(s.n||'').slice(0,24)}}
function cleanPlate(p){if(!p||typeof p!=='object')return null;const c1=String(p.c1||''),c2=String(p.c2||''),fg=String(p.fg||'');if(!COL.test(c1)||!COL.test(c2)||!COL.test(fg))return null;return{c1,c2,fg}}
const cleanName=n=>String(n||'').replace(/[<>&"'\u0000-\u001f]/g,'').trim().slice(0,14)||'Player';
const humans=()=>G.cre.filter(c=>isHuman(c)&&!c.dead);
function join(name,skin,plate){
 const p=mkCre({bot:false,name:cleanName(name),team:0,stage:0});
 p.skin=cleanSkin(skin);p.plate=cleanPlate(plate);p.run=newRun();p.mastery=0;recalc(p);p.hp=p.maxhp;
 const pp=safePos(0);p.x=pp.x;p.y=pp.y;p.fx.shield=5;p.inT=G.t;p.wx=p.wy=0;p.aimA=0;
 G.cre.push(p);PL[p.id]=p;return p.id}
function byId(id){return PL[id]&&!PL[id].dead?PL[id]:null}
function input(id,x,y,a){const c=byId(id);if(!c)return;x=+x||0;y=+y||0;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l}c.wx=x;c.wy=y;c.aimA=+a||0;c.inT=G.t}
function ability(id,key,a){const c=byId(id);if(!c||c.fx.stun>0)return;let ok=false;for(let i=0;i<=c.stage;i++)if(STAGES[i].ab===key)ok=true;if(!ok)return;c.aimA=+a||0;useAbility(c,key,c.aimA)}
function emoteReq(id,e){const c=byId(id);if(c&&EMOJI.indexOf(e)>=0)emote(c,e)}
function info(c,k){const alive=G.cre.filter(o=>!o.boss&&!o.dead&&o!==c);
 return{id:c.id,killer:k&&k!==G.env?k.name:null,run:c.run,totalXp:Math.round(c.totalXp),score:Math.round(c.totalXp+c.run.kills*50+c.run.bosses*200),rank:1+alive.filter(o=>o.totalXp>c.totalXp).length,total:alive.length+1}}
function retire(id){const c=PL[id];if(!c)return null;c.run.time=G.t-(G.t0||0);const d=info(c,null);d.left=true;c.dead=true;G.cre=G.cre.filter(o=>o!==c);delete PL[id];return d}
function leave(id){const c=PL[id];if(!c)return;c.dead=true;G.cre=G.cre.filter(o=>o!==c);delete PL[id]}
let bf=0;
function botFill(){if(++bf<30)return;bf=0;const hs=humans().length,target=Math.max(15,(__cfg.bots||60)-hs),bots=G.cre.filter(c=>c.bot&&!c.boss&&!c.dead);
 if(bots.length>target){bots.sort((a,b)=>a.stage-b.stage);for(let i=0;i<bots.length-target;i++)bots[i].dead=true;G.cre=G.cre.filter(c=>!c.dead)}
 else if(bots.length<target)for(let i=0;i<Math.min(3,target-bots.length);i++)spawnBot(0)}
function tick(dt){
 for(const c of humans())if(G.t-c.inT>.6){c.wx=c.wy=0}
 update(dt);G.parts.length=0;G.txt.length=0;G.fx.length=0;
 botFill();
 const out=[];while(G.deadQ.length){const d=G.deadQ.shift();delete PL[d.c.id];out.push(info(d.c,d.k))}
 return out}
/* ---- snapshots ---- */
const KINDP={acid:0,fire:1,ice:2},ZK={plague:0,acid:1,ink:2};
const flags=o=>{const f=o.fx;return(f.shield>0?1:0)|(f.cloak>0?2:0)|(f.stun>0?4:0)|(f.fear>0?8:0)|(f.slow>0?16:0)|(f.speed>0?32:0)|(o.hitT>0?64:0)|(o.atkT>0?128:0)|(o.dash&&o.dash.hop?256:0)|(o.windup?512:0)};
function welcome(id){return{t:'w',id,W:G.W,seed:G.seed,ev:EVENTS.indexOf(G.ev),tm:G.t,haz:G.haz.map(h=>[h.k,Math.round(h.x),Math.round(h.y),h.r,+h.s.toFixed(2)])}}
function snapshot(h,cs){
 const g=G,px=h.x,py=h.y,R=1800,c=[],nw=[],now=new Set();
 for(const o of g.cre){if(o.dead)continue;if(!o.boss&&(Math.abs(o.x-px)>R||Math.abs(o.y-py)>R))continue;now.add(o.id);
  if(!cs.known.has(o.id)){cs.known.add(o.id);nw.push([o.id,o.name,o.skin?[o.skin.c1,o.skin.c2,o.skin.pat,o.skin.n||'']:0,o.boss?BOSSES.indexOf(o.boss):-1,o.plate?[o.plate.c1,o.plate.c2,o.plate.fg]:0,o.team])}
  c.push([o.id,Math.round(o.x),Math.round(o.y),Math.round(o.vx),Math.round(o.vy),o.stage,Math.ceil(o.hp),Math.ceil(o.maxhp),Math.round(o.r),o.team,flags(o),o.emote?o.emote.e:0,o.windup?+o.windup.a.toFixed(2):0,o.windup?+o.windup.t.toFixed(2):0,o.dash?+o.dash.t.toFixed(2):0])}
 for(const id of cs.known)if(!now.has(id))cs.known.delete(id);
 const cd={};for(const k in h.cd)cd[k]=+h.cd[k].toFixed(2);
 const pr=[],zn=[],rg=[],eg=[],cells=[];
 for(const q of g.proj)if(Math.abs(q.x-px)<R&&Math.abs(q.y-py)<R)pr.push([Math.round(q.x),Math.round(q.y),Math.round(q.vx),Math.round(q.vy),q.r,KINDP[q.kind]|0,+q.life.toFixed(2),q.max]);
 for(const z of g.zones)zn.push([Math.round(z.x),Math.round(z.y),z.r,+z.life.toFixed(1),ZK[z.kind]|0]);
 for(const r of g.rings)rg.push([Math.round(r.x),Math.round(r.y),Math.round(r.r),+r.t.toFixed(2),r.delay,r.col||'#fff',r.inner||0,r.fall||0,r.vis?1:0]);
 for(const e of g.eggs)if(!e.got&&Math.abs(e.x-px)<520&&Math.abs(e.y-py)<520)eg.push([Math.round(e.x),Math.round(e.y)]);
 const cr=1700,x0=Math.max(0,Math.floor((px-cr)/CELL)),x1=Math.min(g.ncx-1,Math.floor((px+cr)/CELL)),y0=Math.max(0,Math.floor((py-cr)/CELL)),y1=Math.min(g.ncx-1,Math.floor((py+cr)/CELL));
 for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const ci=yy*g.ncx+xx,ver=g.cver[ci]|0;if(cs.cv[ci]===ver)continue;cs.cv[ci]=ver;
  const flat=[ci,ver];for(const f of g.cells[ci])flat.push(Math.round(f.x),Math.round(f.y),f.v,f.tmp?1:0,FCOL.indexOf(f.c));cells.push(flat)}
 let mm=0;if(!cs.mmT||g.t-cs.mmT>=1){cs.mmT=g.t;mm=[];for(const o of g.cre)if(!o.dead)mm.push([Math.round(o.x),Math.round(o.y),o.boss?9:(isHuman(o)?3:0)])}
 const rank=g.lb.indexOf(h)+1||g.lb.length+1;
 return{t:'s',tm:+g.t.toFixed(2),me:{xp:Math.round(h.xp*10)/10,tx:Math.round(h.totalXp),mut:h.mut||0,ms:h.mastery||0,k:h.kills,cd,fd:h.run.food},
  c,nw,pr,zn,rg,eg,cells,mm,hw:g.haz.map(z=>z.warn?1:0).join(''),ev:g.evt?[g.evt.ty,+g.evt.t.toFixed(1)]:0,
  lb:g.lb.slice(0,5).map(o=>[o.name,Math.round(o.totalXp),isHuman(o)?1:0]),rk:rank,e:EV}}
globalThis.__api={join,leave,retire,input,ability,emote:emoteReq,tick,snapshot,welcome,byId,clearEvents(){EV.length=0},
 stats(){return{players:humans().length,creatures:G.cre.length,t:+G.t.toFixed(1),bosses:G.cre.filter(c=>c.boss&&!c.dead).length}}};
})();
