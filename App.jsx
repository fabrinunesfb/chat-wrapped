import { useState, useRef, useEffect } from "react";

const loadScript = src => new Promise(res => {
  if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
  const s = document.createElement("script"); s.src = src; s.onload = res;
  document.head.appendChild(s);
});

const _fl = document.createElement("link");
_fl.rel = "stylesheet";
_fl.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,400;0,700;0,900;1,700&display=swap";
document.head.appendChild(_fl);

const _st = document.createElement("style");
_st.textContent = `
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  body,html{margin:0;padding:0;overflow:hidden;height:100%}
  @keyframes pop{0%{transform:scale(0.4) rotate(-6deg);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
  @keyframes slideUp{from{transform:translateY(44px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes shake{0%,100%{transform:rotate(0)}20%{transform:rotate(-6deg)}40%{transform:rotate(6deg)}60%{transform:rotate(-3deg)}80%{transform:rotate(3deg)}}
  @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
  .anim-pop{animation:pop 0.5s cubic-bezier(.17,.67,.35,1.3) forwards}
  .anim-up1{animation:slideUp 0.4s ease forwards}
  .anim-up2{animation:slideUp 0.4s 0.13s ease forwards;opacity:0}
  .anim-up3{animation:slideUp 0.4s 0.25s ease forwards;opacity:0}
  .anim-up4{animation:slideUp 0.4s 0.36s ease forwards;opacity:0}
`;
document.head.appendChild(_st);

// ── PALETTE ────────────────────────────────────────────
const M="#ff2d78", L="#c8f400", B="#0a0a0a", W="#ffffff";
const PURPLE="#7b2fff", TEAL="#00d4c8";
const GREEN="#00c853"; // amigo mode accent
const DIS={fontFamily:"'Bebas Neue',sans-serif"};
const BOD={fontFamily:"'DM Sans',sans-serif"};

// ── MODES ──────────────────────────────────────────────
const MODES = {
  love: {
    key:"love", emoji:"💘", label:"Love", sub:"crush · ficante · namorado/a",
    color:M, bg:"#1a0010",
    desc:"descobre quem tá mais apaixonado/a",
    shareTag:"analisei meu crush",
  },
  amigo: {
    key:"amigo", emoji:"💚", label:"Amigo(a)", sub:"amigo · bestie · colega",
    color:GREEN, bg:"#001a08",
    desc:"descobre quem é o drama-queen da amizade",
    shareTag:"analisei minha amizade",
  },
};

// ── SVG ICONS ──────────────────────────────────────────
const IconZip = () => (
  <svg width="48" height="48" viewBox="0 0 52 52" fill="none">
    <rect x="6" y="4" width="28" height="36" rx="4" fill={W} fillOpacity="0.15" stroke={W} strokeOpacity="0.4" strokeWidth="1.5"/>
    <path d="M24 8v4M28 8v4M24 12h4" stroke={L} strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="6" y="28" width="28" height="12" rx="3" fill={M}/>
    <text x="20" y="37.5" fontSize="7" fontFamily="monospace" fill={W} fontWeight="bold" textAnchor="middle">.zip</text>
  </svg>
);
const IconTxt = () => (
  <svg width="48" height="48" viewBox="0 0 52 52" fill="none">
    <rect x="8" y="4" width="28" height="36" rx="4" fill={W} fillOpacity="0.15" stroke={W} strokeOpacity="0.4" strokeWidth="1.5"/>
    <line x1="14" y1="22" x2="30" y2="22" stroke={W} strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="14" y1="27" x2="30" y2="27" stroke={W} strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="14" y1="32" x2="24" y2="32" stroke={W} strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="8" y="28" width="20" height="12" rx="3" fill={L}/>
    <text x="18" y="37.5" fontSize="7" fontFamily="monospace" fill={B} fontWeight="bold" textAnchor="middle">.txt</text>
  </svg>
);

// ── PARSE ──────────────────────────────────────────────
function parseTxt(raw) {
  const clean = raw.replace(/[\u200e\u200f\u202a-\u202e\ufeff\u00a0]/g, "");
  const lines = clean.split(/\r?\n/);
  const MSG_RE = /^\[?(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\s*[\]\-:]\s*([^:]{1,80}):\s*([\s\S]*)/;
  const SYS_RE = /mensagens e ligações|messages and calls|end-to-end|está na sua lista|added you|created this group|changed the|you're now|security code|notifications about|cifrado|criptograf/i;

  function parseDate(ds, ts) {
    const d = ds.replace(/[.\-]/g, "/");
    const [a, b, c] = d.split("/");
    const yr = c.length <= 2 ? 2000 + +c : +c;
    const [day, mon] = +a > 12 ? [+a, +b] : +b > 12 ? [+b, +a] : [+a, +b];
    const tClean = ts.replace(/\s/g, "");
    const isPM = /[Pp][Mm]$/.test(tClean), isAM = /[Aa][Mm]$/.test(tClean);
    const [hh, mm] = tClean.replace(/[AaPpMm]/g, "").split(":").map(Number);
    let hour = hh;
    if (isPM && hh !== 12) hour = hh + 12;
    if (isAM && hh === 12) hour = 0;
    return new Date(yr, mon - 1, day, hour, mm || 0);
  }

  const msgs = []; let cur = null;
  for (const line of lines) {
    const m = line.match(MSG_RE);
    if (m) {
      if (cur) msgs.push(cur);
      const [, ds, ts, sender, content] = m;
      const s = sender.trim();
      if (SYS_RE.test(content) || s.length > 60) { cur = null; continue; }
      const c = content.trim();
      const fn = c.match(/([\w][\w-]*\.(?:opus|webp|jpe?g|png|mp4|mov|gif|mp3|aac|m4a|3gp))/i)?.[1] || null;
      cur = {
        dt: parseDate(ds, ts), sender: s, content: c,
        isDeleted: /mensagem apagada|this message was deleted|you deleted|apagou esta/i.test(c),
        isMedia: /anexado|omitted|ocultada|omitido|<attached|image omitted|video omitted|audio omitted|sticker omitted|gif omitted/i.test(c) || fn != null,
        mediaType:
          (/STICKER|\.webp/i.test(c) || fn?.toLowerCase().endsWith(".webp")) ? "sticker"
          : (/AUDIO|PTT|\.opus|\.mp3|\.aac|\.m4a|audio omitted/i.test(c) || /\.(opus|mp3|aac|m4a)$/i.test(fn||"")) ? "audio"
          : (/PHOTO|IMG|\.jpe?g|\.png|image omitted/i.test(c) || /\.(jpe?g|png)$/i.test(fn||"")) ? "photo"
          : (/VIDEO|VID|\.mp4|\.mov|GIF|video omitted|gif omitted/i.test(c) || /\.(mp4|mov|gif|3gp)$/i.test(fn||"")) ? "video"
          : /anexado|omitted|ocultada|omitido/i.test(c) ? "other" : null,
        filename: fn,
      };
    } else if (cur && line.trim() && !/^\[?\d{1,2}[\/\.\-]/.test(line)) {
      cur.content += " " + line.trim();
    }
  }
  if (cur) msgs.push(cur);
  return msgs.filter(m => m.sender && m.sender.length > 0);
}

// ── ZIP COUNTER ────────────────────────────────────────
function countZipMedia(zipPaths, messages, p1, p2) {
  const by1 = messages.filter(m=>m.sender===p1);
  const by2 = messages.filter(m=>m.sender===p2);
  const totals = {audio:0,sticker:0,photo:0,video:0};
  zipPaths.forEach(path => {
    const lower = path.toLowerCase();
    if (/\.(opus|mp3|aac|m4a|oga|ogg|wav)$/.test(lower)) { totals.audio++; return; }
    if (/\.webp$/.test(lower)) { totals.sticker++; return; }
    if (/\.(jpe?g|png|gif|heic|heif)$/.test(lower)) { totals.photo++; return; }
    if (/\.(mp4|mov|3gp|mkv|avi)$/.test(lower)) { totals.video++; return; }
  });
  const totalMediaFiles = totals.audio+totals.sticker+totals.photo+totals.video;
  const msgRatio = by1.length/Math.max(by1.length+by2.length,1);
  const result = {[p1]:{audio:0,sticker:0,photo:0,video:0},[p2]:{audio:0,sticker:0,photo:0,video:0}};
  ["audio","sticker","photo","video"].forEach(type => {
    const total = totals[type]; if(!total) return;
    const t1=by1.filter(m=>m.mediaType===type).length;
    const t2=by2.filter(m=>m.mediaType===type).length;
    const sum=t1+t2;
    const ratio=sum>0?t1/sum:msgRatio;
    result[p1][type]=Math.round(ratio*total);
    result[p2][type]=total-result[p1][type];
  });
  return {counts:result,totals,totalMediaFiles};
}

// ── ANALYZE ────────────────────────────────────────────
function analyze(messages, zipResult=null) {
  const freq={};
  messages.forEach(m=>(freq[m.sender]=(freq[m.sender]||0)+1));
  const sorted=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
  if(sorted.length<2) return null;
  const [p1]=sorted[0],[p2]=sorted[1];
  const sn1=p1.split(" ")[0],sn2=p2.split(" ")[0];
  const by1=messages.filter(m=>m.sender===p1);
  const by2=messages.filter(m=>m.sender===p2);
  const EMOJI=/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;

  function rtAvg(spk,rsp){
    const rel=messages.filter(m=>m.sender===spk||m.sender===rsp);
    const t=[];
    for(let i=1;i<rel.length;i++){
      if(rel[i].sender===rsp&&rel[i-1].sender===spk){
        const d=(rel[i].dt-rel[i-1].dt)/60000;
        if(d>0&&d<480)t.push(d);
      }
    }
    return t.length?Math.round(t.reduce((a,b)=>a+b,0)/t.length):0;
  }

  function maxSil(spk,rsp){
    const rel=messages.filter(m=>m.sender===spk||m.sender===rsp);
    let mx=0;
    for(let i=1;i<rel.length;i++){
      if(rel[i].sender===rsp&&rel[i-1].sender===spk){
        const d=(rel[i].dt-rel[i-1].dt)/60000;
        if(d<1440)mx=Math.max(mx,d);
      }
    }
    return Math.round(mx);
  }

  const dayFirst={},dayLast={};
  messages.forEach(m=>{
    const k=m.dt.toDateString();
    if(!dayFirst[k])dayFirst[k]=m.sender;
    dayLast[k]=m.sender;
  });
  const inits={[p1]:0,[p2]:0},closes={[p1]:0,[p2]:0};
  Object.values(dayFirst).forEach(s=>{if(inits[s]!==undefined)inits[s]++;});
  Object.values(dayLast).forEach(s=>{if(closes[s]!==undefined)closes[s]++;});

  function maxStreak(p){let mx=0,c=0;messages.forEach(m=>{if(m.sender===p){c++;mx=Math.max(mx,c)}else c=0});return mx;}

  function topEmojis(msgs){
    const t=msgs.map(m=>m.content).join("");
    const all=t.match(EMOJI)||[];
    const f={};all.forEach(e=>(f[e]=(f[e]||0)+1));
    return Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([e,c])=>({e,c}));
  }

  const RIZZ_LOVE=["amor","linda","lindo","gostosa","gostoso","saudade","beijo","meu bem","gatinha","gatinho","fofa","fofo","perfeita","perfeito","maravilhosa","maravilhoso","meu gato","neném","te amo","meu anjo","meu tudo","meu amor","gato","gata","crush"];
  const RIZZ_AMIGO=["mano","cara","brother","irmão","bff","amiga","amigo","saudade","amo você","te amo amg","melhor","minha pessoa","parceiro","parceira","companheiro","minha vida"];

  function rizzScore(msgs, mode){
    const t=msgs.map(m=>m.content.toLowerCase()).join(" ");
    const words = mode==="amigo" ? RIZZ_AMIGO : RIZZ_LOVE;
    return words.reduce((a,w)=>a+(t.split(w).length-1),0);
  }

  function laughStyle(msgs){
    const joined=msgs.map(m=>m.content).join(" ");
    const lower=joined.toLowerCase();
    const capsHaha=(joined.match(/(?:HA){3,}/g)||[]).length;
    const lowerKkk=(lower.match(/k{4,}/g)||[]).length;
    const anyHaha=(lower.match(/(?:ha){3,}/g)||[]).length;
    const tot=capsHaha+lowerKkk+anyHaha||1;
    if(capsHaha/tot>0.35||capsHaha>4)return{label:"HAHAHA explosivo",emoji:"😭"};
    if(lowerKkk/tot>0.35||lowerKkk>4)return{label:"kkkk raiz",emoji:"💀"};
    if(anyHaha>lowerKkk&&anyHaha>capsHaha&&anyHaha>3)return{label:"haha clássico",emoji:"😂"};
    return{label:"mistura caótica",emoji:"🤡"};
  }

  function caps(msgs){
    const words=msgs.filter(m=>!m.isMedia).flatMap(m=>m.content.split(/\s+/));
    if(!words.length)return 0;
    const c=words.filter(w=>w.length>2&&w===w.toUpperCase()&&/[A-ZÁÉÍÓÚÃ]/.test(w));
    return Math.round((c.length/words.length)*100);
  }

  function delulu(p){let n=0,c=0;messages.forEach(m=>{if(m.sender===p){c++;if(c>=3)n++}else c=0});return n;}
  function peakHour(msgs){const h=new Array(24).fill(0);msgs.forEach(m=>h[m.dt.getHours()]++);return h.indexOf(Math.max(...h));}
  function nightMsgs(msgs){return msgs.filter(m=>{const h=m.dt.getHours();return h>=0&&h<5;}).length;}
  function hourSpark(msgs){const h=new Array(24).fill(0);msgs.forEach(m=>h[m.dt.getHours()]++);return h;}

  const STOP=new Set(["que","de","o","a","e","é","em","um","uma","com","para","não","se","na","no","do","da","os","as","eu","você","me","te","nos","ele","ela","isso","esse","essa","mas","por","mais","como","seu","sua","então","pra","pro","muito","bem","só","vc","sim","não","vou","vai","faz","ter","mano","gente","cara","acho","também","assim","quem","onde","quando","ainda","até","depois","antes","hoje","ontem","agora","aqui","ai","ah","oh","ok","rs","kk","haha","kkk","né","ta","tá","foi","ser","tem","essa","minha","meu","tudo"]);
  function topWords(msgs){
    const txt=msgs.filter(m=>!m.isMedia&&!m.isDeleted).map(m=>m.content.toLowerCase()).join(" ");
    const words=txt.match(/[a-záéíóúãõâêîôûçàèìòùü]{3,}/g)||[];
    const f={};
    words.forEach(w=>{if(!STOP.has(w)&&w.length>=3)f[w]=(f[w]||0)+1;});
    return Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([w,c])=>({w,c}));
  }

  function mainCharScore(msgs){
    const txt=msgs.map(m=>m.content.toLowerCase()).join(" ");
    const s=(txt.match(/\b(eu|meu|minha|meus|minhas|comigo)\b/g)||[]).length;
    const o=(txt.match(/\b(você|vc|te|teu|tua|contigo)\b/g)||[]).length;
    return o>0?Math.round(s/(s+o)*100):50;
  }

  function busiestDay(){
    const d={};
    messages.forEach(m=>{const k=m.dt.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"2-digit"});d[k]=(d[k]||0)+1;});
    const [day,count]=Object.entries(d).sort((a,b)=>b[1]-a[1])[0]||["?",0];
    return{day,count};
  }

  const days=[...new Set(messages.map(m=>m.dt.toDateString()))].length;
  const zc=zipResult?.counts;
  const zipHasData=zipResult&&zipResult.totalMediaFiles>0;
  function media(p,type,byMsgs){
    if(zipHasData&&zc&&zc[p])return zc[p][type]||0;
    return byMsgs.filter(m=>m.mediaType===type).length;
  }

  const zipInfo=zipResult?`📦 ${zipResult.totalMediaFiles} mídias — 🎙️${zipResult.totals.audio} · 🎭${zipResult.totals.sticker} · 📸${zipResult.totals.photo} · 🎬${zipResult.totals.video}`:null;

  function stats(msgs,p,other,mode){
    return{
      count:msgs.length,
      audio:media(p,"audio",msgs),sticker:media(p,"sticker",msgs),
      photo:media(p,"photo",msgs),video:media(p,"video",msgs),
      deleted:msgs.filter(m=>m.isDeleted).length,
      questions:msgs.filter(m=>m.content.includes("?")).length,
      emojiCount:(msgs.map(m=>m.content).join("").match(EMOJI)||[]).length,
      topEmojis:topEmojis(msgs),
      rizz:rizzScore(msgs,mode||"love"),
      laugh:laughStyle(msgs),caps:caps(msgs),delulu:delulu(p),
      avgResp:rtAvg(other,p),maxSilence:maxSil(other,p),
      initiates:inits[p],closesDay:closes[p],maxStreak:maxStreak(p),
      peakHour:peakHour(msgs),nightMsgs:nightMsgs(msgs),
      topWords:topWords(msgs),mainCharScore:mainCharScore(msgs),hourSpark:hourSpark(msgs),
    };
  }

  const busy=busiestDay();
  return{p1,p2,sn1,sn2,total:messages.length,days,hasZip:zipHasData,zipInfo,
    s1:stats(by1,p1,p2),s2:stats(by2,p2,p1),busiestDay:busy};
}

// ── HELPERS ────────────────────────────────────────────
const fmtMin=m=>!m?"<1min":m<60?`${m}min`:`${Math.floor(m/60)}h${m%60?m%60+"min":""}`;
const fmtH=h=>h===0?"meia-noite":h<12?`${h}h da manhã`:h===12?"12h":h<18?`${h}h da tarde`:`${h}h da noite`;
const winOf=(v1,v2,h=true)=>h?(v1>v2?1:v2>v1?2:0):(v1<v2?1:v2<v1?2:0);
const SITE="chat-wrapped.app";

// ── BUILD SLIDES ───────────────────────────────────────
function buildSlides(d, mode="love") {
  const{sn1,sn2,total,days,s1,s2,busiestDay,hasZip,zipInfo}=d;
  const W2=(v1,v2,h=true)=>winOf(v1,v2,h);
  const isLove = mode==="love";
  const mColor = isLove ? M : GREEN;

  // Mode-aware roast helpers
  const rizzLabel = isLove ? "RIZZ\nSCORE 💘" : "INTENSIDADE\nDE AMIZADE 💚";
  const rizzSub   = isLove ? "amor · saudade · neném · beijo…" : "mano · irmão · bff · amo você…";

  function roastMsgs(big, small) {
    if(isLove) return`${big} simplesmente não para. é amor ou só insônia? 🫠`;
    return `${big} domina o grupo. ${small} é o quieto que julga todos 😂`;
  }
  function roastResp(faster) {
    if(!faster) return "os dois ficam com o celular na mão. sabemos.";
    if(isLove) return `${faster} responde mais rápido. a.k.a. mais ansioso/a 👀`;
    return `${faster} responde mais rápido. não consegue ignorar 😅`;
  }
  function roastGhost(nm, val) {
    if(!nm) return isLove?"os dois somem igual. dois fantasmas 👻":"os dois somem. parceria de introvertidos 💀";
    if(isLove) return `${nm} ficou ${val} sem responder 👻 pensando ou só ignorando?`;
    return `${nm} deu o ghost por ${val}. precisava de uma pausa da amizade 😭`;
  }
  function roastNight(nm, n) {
    if(!nm||n===0) return "os dois dormem em paz. gente rara.";
    if(isLove) return `${nm} mandou ${n} msgs entre 0h e 5h 🌙 insônia ou saudade?`;
    return `${nm} manda mensagem às 3h da manhã. esse alguém precisa dormir 😂`;
  }
  function roastInit(nm) {
    if(!nm) return "os dois começam igual. amizade equilibrada.";
    if(isLove) return `${nm} começa quase todo dia. coragem ou dependência? ✨`;
    return `${nm} sempre inicia. o/a organizador/a da bagunça 🫡`;
  }
  function roastRizz(r, nm, other) {
    if(!r) return isLove?"zero rizz dos dois. relacionamento no automático.":"zero intensidade. amizade seca 💀";
    if(isLove) return `${nm} derrama afeto e ${other} responde com sticker 💀`;
    return `${nm} é a cola da amizade. ${other} aparece quando quer 😂`;
  }
  function roastDelulu(nm, n) {
    if(!nm) return isLove?"os dois são delulus iguais. casal perfeito.":"os dois mandam mensagens no vácuo. amizade caótica.";
    if(isLove) return `${nm} mandou ${n}x seguido sem resposta 🤡`;
    return `${nm} mandou ${n}x no vácuo. deixa a pessoa respirar 😭`;
  }
  function roastMedia() {
    if(s1.audio>s2.audio*2) return isLove?`${sn1} vive de áudio. quem ouve merece prêmio 🎙️`:`${sn1} não para de mandar áudio. maratonista do zap 🎙️`;
    if(s2.audio>s1.audio*2) return isLove?`${sn2} vive de áudio. quem ouve merece prêmio 🎙️`:`${sn2} não para de mandar áudio. maratonista do zap 🎙️`;
    if(s1.sticker>s2.sticker*2) return `${sn1} fala por sticker. economiza emoção.`;
    if(s2.sticker>s1.sticker*2) return `${sn2} fala por sticker. economiza emoção.`;
    return "dois grandes produtores de conteúdo 🎬";
  }
  function roastMain(nm) {
    if(!nm) return "os dois falam de si mesmos igual.";
    if(isLove) return `${nm} é o/a protagonista dessa história ✨`;
    return `${nm} transforma qualquer assunto em falar de si mesmo 😂`;
  }
  function verdicts() {
    const v=[];
    if(isLove){
      if(s1.rizz>s2.rizz*1.5)v.push(`💘 ${sn1} está claramente mais apaixonado/a`);
      if(s2.rizz>s1.rizz*1.5)v.push(`💘 ${sn2} está claramente mais apaixonado/a`);
      if(s1.avgResp<s2.avgResp*0.6)v.push(`⚡ ${sn1} responde mais rápido — tá ansioso/a`);
      if(s2.avgResp<s1.avgResp*0.6)v.push(`⚡ ${sn2} responde mais rápido — tá ansioso/a`);
    } else {
      if(s1.rizz>s2.rizz*1.5)v.push(`💚 ${sn1} é o/a mais intenso/a da amizade`);
      if(s2.rizz>s1.rizz*1.5)v.push(`💚 ${sn2} é o/a mais intenso/a da amizade`);
      if(s1.count>s2.count*1.5)v.push(`🗣️ ${sn1} domina a conversa — nunca cala`);
      if(s2.count>s1.count*1.5)v.push(`🗣️ ${sn2} domina a conversa — nunca cala`);
    }
    if(s1.deleted>s2.deleted+2)v.push(`🗑️ ${sn1} apagou ${s1.deleted} msgs — escondendo algo`);
    if(s2.deleted>s1.deleted+2)v.push(`🗑️ ${sn2} apagou ${s2.deleted} msgs — escondendo algo`);
    if(s1.initiates>s2.initiates*1.5)v.push(isLove?`🌅 ${sn1} começa quase tudo — tá doido/a`:`🌅 ${sn1} é o/a animador/a da amizade`);
    if(s2.initiates>s1.initiates*1.5)v.push(isLove?`🌅 ${sn2} começa quase tudo — tá doido/a`:`🌅 ${sn2} é o/a animador/a da amizade`);
    if(s1.nightMsgs>s2.nightMsgs*2&&s1.nightMsgs>5)v.push(isLove?`🌙 ${sn1} vive de madrugada — saudade?`:`🌙 ${sn1} manda mensagem às 3h. esse alguém precisa dormir`);
    if(s2.nightMsgs>s1.nightMsgs*2&&s2.nightMsgs>5)v.push(isLove?`🌙 ${sn2} vive de madrugada — saudade?`:`🌙 ${sn2} manda mensagem às 3h. esse alguém precisa dormir`);
    if(!v.length)v.push(isLove?"🤝 conversa equilibrada — os dois igualmente delusionais":"🤝 amizade equilibrada — drama distribuído com justiça");
    return v;
  }

  const bigWin=W2(s1.count,s2.count)===1?sn1:sn2;
  const bigLose=bigWin===sn1?sn2:sn1;
  const respFaster=W2(s1.avgResp,s2.avgResp,false)===1?sn1:W2(s1.avgResp,s2.avgResp,false)===2?sn2:null;
  const ghostNm=W2(s1.maxSilence,s2.maxSilence,true)===1?sn1:W2(s1.maxSilence,s2.maxSilence,true)===2?sn2:null;
  const nightNm=W2(s1.nightMsgs,s2.nightMsgs)===1?sn1:W2(s1.nightMsgs,s2.nightMsgs)===2?sn2:null;
  const initNm=W2(s1.initiates,s2.initiates)===1?sn1:W2(s1.initiates,s2.initiates)===2?sn2:null;
  const rizzNm=W2(s1.rizz,s2.rizz)===1?sn1:W2(s1.rizz,s2.rizz)===2?sn2:null;
  const rizzOther=rizzNm===sn1?sn2:sn1;
  const deluluNm=W2(s1.delulu,s2.delulu)===1?sn1:W2(s1.delulu,s2.delulu)===2?sn2:null;
  const mainNm=s1.mainCharScore>s2.mainCharScore+10?sn1:s2.mainCharScore>s1.mainCharScore+10?sn2:null;

  return [
    {id:"intro",bg:B,accent:mColor,type:"INTRO",sub:`${sn1} & ${sn2}`,mode,
     detail:`${total.toLocaleString("pt-BR")} msgs · ${days} dias${hasZip?" · 📦 mídia incluída":""}`,
     modeLabel:isLove?"modo love 💘":"modo amigo 💚"},

    {id:"msgs",bg:mColor,accent:W,type:"VERSUS",headline:"QUEM\nFALA MAIS?",n1:s1.count,n2:s2.count,unit:"msgs",
     winner:W2(s1.count,s2.count),roast:roastMsgs(bigWin,bigLose)},

    {id:"resp",bg:B,accent:mColor,type:"VERSUS",headline:"VELOCIDADE\nDE RESPOSTA",
     n1:fmtMin(s1.avgResp),n2:fmtMin(s2.avgResp),unit:"média",
     winner:W2(s1.avgResp,s2.avgResp,false),roast:roastResp(respFaster)},

    {id:"ghost",bg:PURPLE,accent:W,type:"GHOST",headline:"MAIOR\nVACILO 👻",
     n1:fmtMin(s1.maxSilence),n2:fmtMin(s2.maxSilence),
     winner:W2(s1.maxSilence,s2.maxSilence,false),
     roast:roastGhost(ghostNm,fmtMin(Math.max(s1.maxSilence,s2.maxSilence)))},

    {id:"night",bg:B,accent:M,type:"NIGHT",headline:"MADRUGADA\nCOMPULSIVA 🌙",
     n1:s1.nightMsgs,n2:s2.nightMsgs,peak1:fmtH(s1.peakHour),peak2:fmtH(s2.peakHour),
     winner:W2(s1.nightMsgs,s2.nightMsgs),
     roast:roastNight(nightNm,Math.max(s1.nightMsgs,s2.nightMsgs))},

    {id:"init",bg:mColor,accent:W,type:"VERSUS",headline:"QUEM COMEÇA\nSEMPRE?",
     n1:s1.initiates,n2:s2.initiates,unit:"dias",winner:W2(s1.initiates,s2.initiates),roast:roastInit(initNm)},

    {id:"rizz",bg:L,accent:B,type:"SCORE",headline:rizzLabel,dark:true,
     scores:[{name:sn1,val:s1.rizz,max:Math.max(s1.rizz,s2.rizz,1)},{name:sn2,val:s2.rizz,max:Math.max(s1.rizz,s2.rizz,1)}],
     sub:rizzSub,barColors:[mColor,PURPLE],roast:roastRizz(W2(s1.rizz,s2.rizz),rizzNm,rizzOther)},

    {id:"delulu",bg:B,accent:M,type:"SCORE",headline:"DELULU\nINDEX 🤡",
     scores:[{name:sn1,val:s1.delulu,max:Math.max(s1.delulu,s2.delulu,1)},{name:sn2,val:s2.delulu,max:Math.max(s1.delulu,s2.delulu,1)}],
     sub:"rajadas de 3+ msgs seguidas sem resposta",barColors:[L,TEAL],
     roast:roastDelulu(deluluNm,Math.max(s1.delulu,s2.delulu))},

    {id:"deleted",bg:PURPLE,accent:W,type:"DELETED",headline:"MSGS\nAPAGADAS 🗑️",
     n1:s1.deleted,n2:s2.deleted,winner:W2(s1.deleted,s2.deleted,false),
     roast:(()=>{const nm=W2(s1.deleted,s2.deleted,true)===1?sn1:W2(s1.deleted,s2.deleted,true)===2?sn2:null;if(!nm||(s1.deleted===0&&s2.deleted===0))return"ninguém apagou nada. transparência total.";return`${nm} apagou ${Math.max(s1.deleted,s2.deleted)} msgs 🕵️ o que escondia???`;})()},

    {id:"media",bg:L,accent:B,type:"MEDIA",headline:"MÍDIAS\nENVIADAS",dark:true,zipInfo,
     rows:[{label:"🎙️ áudios",v1:s1.audio,v2:s2.audio},{label:"🎭 stickers",v1:s1.sticker,v2:s2.sticker},{label:"📸 fotos",v1:s1.photo,v2:s2.photo},{label:"🎬 vídeos",v1:s1.video,v2:s2.video}],
     roast:roastMedia()},

    {id:"words",bg:mColor,accent:W,type:"WORDS",headline:"TOP PALAVRAS\nDA CONVERSA 🗣️",w1:s1.topWords,w2:s2.topWords,
     roast:"as palavras mais usadas revelam tudo."},

    {id:"laugh",bg:B,accent:L,type:"LAUGH",headline:"ESTILO\nDE RISO 😂",
     items:[{name:sn1,...s1.laugh},{name:sn2,...s2.laugh}],roast:"o riso é a alma exposta. não tem como fingir."},

    {id:"main",bg:PURPLE,accent:L,type:"MAINCHAR",headline:"MAIN\nCHARACTER ✨",
     s1mc:s1.mainCharScore,s2mc:s2.mainCharScore,roast:roastMain(mainNm)},

    {id:"busyday",bg:L,accent:B,type:"BUSYDAY",dark:true,headline:"DIA MAIS\nMALUCO 🔥",
     day:busiestDay.day,count:busiestDay.count,roast:`${busiestDay.count} mensagens em um dia só. o que aconteceu ali???`},

    {id:"emojis",bg:B,accent:L,type:"EMOJIS",headline:"TOP\nEMOJIS ✨",
     items:[{name:sn1,emojis:s1.topEmojis},{name:sn2,emojis:s2.topEmojis}],
     roast:"os emojis são sua assinatura emocional."},

    {id:"hours",bg:mColor,accent:W,type:"HOURS",headline:"QUANDO MAIS\nATIVOS?",
     spark1:s1.hourSpark,spark2:s2.hourSpark,peak1:fmtH(s1.peakHour),peak2:fmtH(s2.peakHour),
     roast:`pico: ${sn1} às ${fmtH(s1.peakHour)} · ${sn2} às ${fmtH(s2.peakHour)}`},

    {id:"verdict",bg:B,accent:mColor,type:"VERDICT",headline:"VEREDITO\nFINAL 🏆",
     items:verdicts(),sub:`${total.toLocaleString("pt-BR")} msgs · ${days} dias`},
  ];
}

// ── COMPONENTS ─────────────────────────────────────────
function ProgressBar({idx,total,color}){
  return(
    <div style={{display:"flex",gap:3,padding:"12px 16px 0",flexShrink:0}}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{flex:1,height:3,borderRadius:99,background:i<=idx?color:`${color}33`,transition:"background 0.3s"}}/>
      ))}
    </div>
  );
}

function Roast({text,textC,accent}){
  return(
    <div className="anim-up4" style={{background:`${textC}12`,borderLeft:`4px solid ${accent}`,borderRadius:"0 14px 14px 0",padding:"13px 16px",flexShrink:0}}>
      <div style={{...BOD,fontSize:15,fontWeight:700,color:textC,lineHeight:1.55}}>{text}</div>
    </div>
  );
}

function MiniBar({v1,v2,c1=B,c2=M}){
  const t=v1+v2||1;
  return(
    <div style={{height:8,borderRadius:99,background:"rgba(0,0,0,0.12)",overflow:"hidden",display:"flex"}}>
      <div style={{width:`${(v1/t)*100}%`,background:c1,transition:"width 1s"}}/>
      <div style={{width:`${(v2/t)*100}%`,background:c2,transition:"width 1s"}}/>
    </div>
  );
}

function SparkLine({data,color,height=36}){
  const mx=Math.max(...data,1);
  const pts=data.map((v,i)=>`${(i/23)*100},${height-(v/mx)*height}`).join(" ");
  return(
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

// ── SLIDE ──────────────────────────────────────────────
function Slide({slide,sn1,sn2,idx,total}){
  const{bg,accent,type}=slide;
  const textC=accent,subC=`${accent}88`;
  const SPACER=88;
  const PB=<ProgressBar idx={idx} total={total} color={accent}/>;

  if(type==="INTRO") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-80,right:-80,width:280,height:280,borderRadius:"50%",border:`2px solid ${accent}22`}}/>
      <div style={{position:"absolute",bottom:120,left:-60,width:220,height:220,borderRadius:"50%",background:`${accent}12`}}/>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"16px 24px"}}>
        <div className="anim-pop">
          <div style={{...BOD,fontSize:11,letterSpacing:4,color:`${accent}66`,textTransform:"uppercase",marginBottom:8}}>{slide.modeLabel}</div>
          <div style={{...DIS,fontSize:96,color:accent,lineHeight:0.82}}>CHAT</div>
          <div style={{...DIS,fontSize:96,color:M,lineHeight:0.82,marginBottom:20}}>WRAPPED</div>
        </div>
        <div className="anim-up2" style={{borderTop:`1px solid ${accent}28`,paddingTop:16}}>
          <div style={{...BOD,fontSize:24,fontWeight:900,color:textC,letterSpacing:-0.5,marginBottom:4}}>{slide.sub}</div>
          <div style={{...BOD,fontSize:13,color:subC,fontWeight:600}}>{slide.detail}</div>
        </div>
      </div>
      <div className="anim-up3" style={{padding:"0 24px 32px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{...BOD,fontSize:12,color:`${accent}55`,letterSpacing:2,animation:"blink 2s infinite"}}>TAP PARA COMEÇAR</div>
        <div style={{fontSize:14,color:accent,animation:"blink 2s 0.5s infinite"}}>→</div>
      </div>
    </div>
  );

  if(type==="VERSUS"){
    const isNum=typeof slide.n1==="number",w=slide.winner;
    return(
      <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
        {PB}
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
          <div className="anim-up1" style={{...DIS,fontSize:50,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
          <div className="anim-up2" style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{...BOD,fontSize:11,fontWeight:700,color:subC,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{sn1}</div>
              <div style={{...DIS,fontSize:isNum?76:48,color:w===1?accent:`${textC}44`,lineHeight:1}}>{slide.n1}</div>
              {slide.unit&&<div style={{...BOD,fontSize:12,color:subC,marginTop:2}}>{slide.unit}</div>}
              {w===1&&<div style={{fontSize:18,marginTop:4}}>👑</div>}
            </div>
            <div style={{...DIS,fontSize:18,color:`${textC}28`}}>VS</div>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{...BOD,fontSize:11,fontWeight:700,color:subC,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{sn2}</div>
              <div style={{...DIS,fontSize:isNum?76:48,color:w===2?accent:`${textC}44`,lineHeight:1}}>{slide.n2}</div>
              {slide.unit&&<div style={{...BOD,fontSize:12,color:subC,marginTop:2}}>{slide.unit}</div>}
              {w===2&&<div style={{fontSize:18,marginTop:4}}>👑</div>}
            </div>
          </div>
          <Roast text={slide.roast} textC={textC} accent={accent}/>
        </div>
        <div style={{height:SPACER}}/>
      </div>
    );
  }

  if(type==="GHOST"){
    const w=slide.winner;
    return(
      <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
        {PB}
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
          <div className="anim-up1" style={{...DIS,fontSize:50,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
          <div className="anim-up2" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{...BOD,fontSize:11,color:subC,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{sn1}</div>
              <div style={{...DIS,fontSize:52,color:w===1?accent:`${textC}44`,lineHeight:1,animation:w===1?"shake 0.6s 0.5s":"none"}}>{slide.n1}</div>
              {w===1&&<div style={{fontSize:16,marginTop:4}}>👻</div>}
            </div>
            <div style={{fontSize:48,animation:"float 3s ease-in-out infinite"}}>👻</div>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{...BOD,fontSize:11,color:subC,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{sn2}</div>
              <div style={{...DIS,fontSize:52,color:w===2?accent:`${textC}44`,lineHeight:1,animation:w===2?"shake 0.6s 0.5s":"none"}}>{slide.n2}</div>
              {w===2&&<div style={{fontSize:16,marginTop:4}}>👻</div>}
            </div>
          </div>
          <Roast text={slide.roast} textC={textC} accent={accent}/>
        </div>
        <div style={{height:SPACER}}/>
      </div>
    );
  }

  if(type==="NIGHT"){
    const w=slide.winner;
    return(
      <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
        {PB}
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
          <div className="anim-up1" style={{...DIS,fontSize:48,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
          <div className="anim-up2" style={{flex:1,display:"flex",gap:10,alignItems:"center"}}>
            {[{n:sn1,v:slide.n1,pk:slide.peak1,win:w===1},{n:sn2,v:slide.n2,pk:slide.peak2,win:w===2}].map(({n,v,pk,win})=>(
              <div key={n} style={{flex:1,textAlign:"center",background:`${textC}10`,borderRadius:16,padding:"14px 8px",border:`2px solid ${win?accent:`${textC}15`}`}}>
                <div style={{...BOD,fontSize:11,color:subC,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{n}</div>
                <div style={{fontSize:26,marginBottom:4}}>{v>0?"🌙":"😴"}</div>
                <div style={{...DIS,fontSize:48,color:win?accent:`${textC}55`,lineHeight:1}}>{v}</div>
                <div style={{...BOD,fontSize:10,color:subC,marginTop:4}}>msgs 0h-5h</div>
                <div style={{...BOD,fontSize:11,fontWeight:700,color:accent,marginTop:6}}>{pk}</div>
              </div>
            ))}
          </div>
          <Roast text={slide.roast} textC={textC} accent={accent}/>
        </div>
        <div style={{height:SPACER}}/>
      </div>
    );
  }

  if(type==="SCORE") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:50,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:6}}>
          {slide.scores.map(({name,val,max},i)=>(
            <div key={name} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
                <span style={{...BOD,fontSize:14,fontWeight:700,color:textC}}>{name}</span>
                <span style={{...DIS,fontSize:40,color:accent,lineHeight:1}}>{val}</span>
              </div>
              <div style={{height:14,borderRadius:99,background:`${textC}18`,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:99,width:`${Math.max(4,(val/max)*100)}%`,background:(slide.barColors||[M,L])[i],transition:"width 1.2s cubic-bezier(.17,.67,.35,1)"}}/>
              </div>
            </div>
          ))}
          <div style={{...BOD,fontSize:12,color:subC}}>{slide.sub}</div>
        </div>
        <Roast text={slide.roast} textC={textC} accent={accent}/>
      </div>
      <div style={{height:SPACER}}/>
    </div>
  );

  if(type==="DELETED"){
    const w=slide.winner;
    return(
      <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
        {PB}
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
          <div className="anim-up1" style={{...DIS,fontSize:50,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
          <div className="anim-up2" style={{flex:1,display:"flex",gap:12,alignItems:"center"}}>
            {[{n:sn1,v:slide.n1,win:w===1},{n:sn2,v:slide.n2,win:w===2}].map(({n,v,win})=>(
              <div key={n} style={{flex:1,textAlign:"center",border:`2px solid ${textC}22`,borderRadius:16,padding:"18px 8px",background:win?`${textC}10`:"transparent"}}>
                <div style={{...BOD,fontSize:11,color:subC,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{n}</div>
                <div style={{...DIS,fontSize:72,color:v>0?accent:`${textC}33`,lineHeight:1,animation:v>0?"shake 0.5s 0.5s":"none"}}>{v}</div>
                <div style={{...BOD,fontSize:12,color:subC,marginTop:6}}>{v===0?"impecável 💅":"hmmmm 👀"}</div>
              </div>
            ))}
          </div>
          <Roast text={slide.roast} textC={textC} accent={accent}/>
        </div>
        <div style={{height:SPACER}}/>
      </div>
    );
  }

  if(type==="MEDIA") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:46,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"flex-end",gap:24,...BOD,fontSize:11,color:subC,textTransform:"uppercase",letterSpacing:2,marginBottom:8,paddingRight:4}}>
            <span>{sn1}</span><span>{sn2}</span>
          </div>
          {slide.rows.map(({label,v1,v2})=>(
            <div key={label} style={{marginBottom:11}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{...BOD,fontSize:14,color:textC,fontWeight:600}}>{label}</span>
                <div style={{display:"flex",gap:16}}>
                  <span style={{...DIS,fontSize:28,color:v1>v2?accent:`${textC}55`}}>{v1}</span>
                  <span style={{...DIS,fontSize:28,color:v2>v1?M:`${textC}55`}}>{v2}</span>
                </div>
              </div>
              <MiniBar v1={v1} v2={v2} c1={B} c2={M}/>
            </div>
          ))}
          {slide.zipInfo&&<div style={{...BOD,fontSize:10,color:`${textC}55`,marginTop:6,lineHeight:1.5}}>{slide.zipInfo}</div>}
        </div>
        <Roast text={slide.roast} textC={textC} accent={accent}/>
      </div>
      <div style={{height:SPACER}}/>
    </div>
  );

  if(type==="WORDS") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:46,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",gap:14}}>
          {[{name:sn1,words:slide.w1},{name:sn2,words:slide.w2}].map(({name,words})=>(
            <div key={name} style={{flex:1}}>
              <div style={{...BOD,fontSize:11,color:subC,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>{name}</div>
              {words.length?words.map(({w,c},i)=>(
                <div key={w} style={{marginBottom:9}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{...BOD,fontSize:12+((4-i)*1.5),fontWeight:700,color:textC}}>{w}</span>
                    <span style={{...BOD,fontSize:10,color:subC}}>×{c}</span>
                  </div>
                  <div style={{height:4,borderRadius:99,background:`${textC}15`,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.max(10,(c/words[0].c)*100)}%`,background:i===0?accent:i===1?M:PURPLE,borderRadius:99,transition:"width 1s"}}/>
                  </div>
                </div>
              )):<div style={{...BOD,fontSize:12,color:subC}}>sem dados 💀</div>}
            </div>
          ))}
        </div>
        <Roast text={slide.roast} textC={textC} accent={accent}/>
      </div>
      <div style={{height:SPACER}}/>
    </div>
  );

  if(type==="LAUGH") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:50,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:10}}>
          {slide.items.map(({name,label,emoji},i)=>(
            <div key={name} style={{display:"flex",alignItems:"center",gap:14,background:`${textC}10`,borderRadius:14,padding:"14px 16px",borderLeft:`4px solid ${i===0?M:L}`}}>
              <span style={{fontSize:44,animation:"float 3s ease-in-out infinite"}}>{emoji}</span>
              <div>
                <div style={{...BOD,fontSize:11,color:subC,textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>{name}</div>
                <div style={{...DIS,fontSize:28,color:accent}}>{label}</div>
              </div>
            </div>
          ))}
        </div>
        <Roast text={slide.roast} textC={textC} accent={accent}/>
      </div>
      <div style={{height:SPACER}}/>
    </div>
  );

  if(type==="MAINCHAR") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:50,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:14}}>
          <div style={{...BOD,fontSize:12,color:subC,textAlign:"center"}}>% das msgs focadas em si mesmo vs no outro</div>
          {[{n:sn1,v:slide.s1mc},{n:sn2,v:slide.s2mc}].map(({n,v})=>(
            <div key={n}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                <span style={{...BOD,fontSize:14,fontWeight:700,color:textC}}>{n}</span>
                <span style={{...DIS,fontSize:34,color:v>55?accent:`${textC}77`,lineHeight:1}}>{v}%</span>
              </div>
              <div style={{height:16,borderRadius:99,background:`${textC}15`,overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:2,background:`${textC}30`,zIndex:1}}/>
                <div style={{height:"100%",width:`${v}%`,background:v>55?M:L,borderRadius:99,transition:"width 1.2s ease"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span style={{...BOD,fontSize:10,color:subC}}>← fala do outro</span>
                <span style={{...BOD,fontSize:10,color:subC}}>fala de si →</span>
              </div>
            </div>
          ))}
        </div>
        <Roast text={slide.roast} textC={textC} accent={accent}/>
      </div>
      <div style={{height:SPACER}}/>
    </div>
  );

  if(type==="BUSYDAY") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:50,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",gap:6}}>
          <div style={{fontSize:48,animation:"float 3s ease-in-out infinite"}}>🔥</div>
          <div style={{...DIS,fontSize:84,color:textC,lineHeight:1}}>{slide.count}</div>
          <div style={{...BOD,fontSize:13,color:subC}}>mensagens em</div>
          <div style={{...DIS,fontSize:28,color:accent,textTransform:"capitalize",textAlign:"center"}}>{slide.day}</div>
        </div>
        <Roast text={slide.roast} textC={textC} accent={accent}/>
      </div>
      <div style={{height:SPACER}}/>
    </div>
  );

  if(type==="EMOJIS") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:50,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",gap:16}}>
          {slide.items.map(({name,emojis})=>(
            <div key={name} style={{flex:1}}>
              <div style={{...BOD,fontSize:11,color:subC,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>{name}</div>
              {emojis.length?emojis.map(({e,c},i)=>(
                <div key={e} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:28-i*2}}>{e}</span>
                  <span style={{...BOD,fontSize:12,color:subC,fontWeight:700}}>×{c}</span>
                </div>
              )):<div style={{...BOD,fontSize:12,color:subC}}>nenhum emoji 💀</div>}
            </div>
          ))}
        </div>
        <Roast text={slide.roast} textC={textC} accent={accent}/>
      </div>
      <div style={{height:SPACER}}/>
    </div>
  );

  if(type==="HOURS") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:50,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:14}}>
          {[{n:sn1,spark:slide.spark1,pk:slide.peak1,col:M},{n:sn2,spark:slide.spark2,pk:slide.peak2,col:L}].map(({n,spark,pk,col})=>(
            <div key={n} style={{background:`${textC}10`,borderRadius:14,padding:"12px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{...BOD,fontSize:13,fontWeight:700,color:textC}}>{n}</span>
                <span style={{...DIS,fontSize:18,color:col}}>pico: {pk}</span>
              </div>
              <SparkLine data={spark} color={col} height={34}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
                <span style={{...BOD,fontSize:9,color:subC}}>0h</span>
                <span style={{...BOD,fontSize:9,color:subC}}>12h</span>
                <span style={{...BOD,fontSize:9,color:subC}}>23h</span>
              </div>
            </div>
          ))}
        </div>
        <Roast text={slide.roast} textC={textC} accent={accent}/>
      </div>
      <div style={{height:SPACER}}/>
    </div>
  );

  if(type==="VERDICT") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-60,right:-60,width:200,height:200,borderRadius:"50%",background:`${accent}12`,pointerEvents:"none"}}/>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:50,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:8}}>
          {slide.items.map((item,i)=>(
            <div key={i} style={{...BOD,fontSize:14,fontWeight:700,color:textC,background:`${textC}10`,borderRadius:12,padding:"11px 14px",borderLeft:`3px solid ${accent}`,lineHeight:1.5}}>{item}</div>
          ))}
        </div>
        <div className="anim-up3" style={{...BOD,fontSize:11,color:`${textC}44`,textAlign:"center",letterSpacing:1,marginBottom:4}}>{slide.sub}</div>
      </div>
      <div style={{height:SPACER}}/>
    </div>
  );

  return null;
}

// ── CAPTURE ────────────────────────────────────────────
async function captureEl(el) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  const animated = el.querySelectorAll('.anim-pop,.anim-up1,.anim-up2,.anim-up3,.anim-up4');
  const saved = [];
  animated.forEach(node => {
    saved.push({node,anim:node.style.animation,op:node.style.opacity,tr:node.style.transform});
    node.style.cssText += ";animation:none!important;opacity:1!important;transform:none!important;";
  });
  await new Promise(r=>setTimeout(r,80));
  const canvas = await window.html2canvas(el,{useCORS:true,allowTaint:true,scale:2,backgroundColor:null,logging:false});
  saved.forEach(({node,anim,op,tr})=>{node.style.animation=anim;node.style.opacity=op;node.style.transform=tr;});
  return canvas;
}

// ── SHARE ──────────────────────────────────────────────
async function doShare(canvas, text, setToast, setOverlay) {
  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise(res => canvas.toBlob(b=>res(b),"image/png"));
  if (!blob) { setToast("erro ao gerar imagem 😢"); return; }
  const file = new File([blob],"chat-wrapped.png",{type:"image/png"});
  if (navigator.share && navigator.canShare?.({files:[file]})) {
    try { await navigator.share({files:[file],text,title:"Chat Wrapped"}); setToast("compartilhado! 🚀"); return; }
    catch(e) { if(e.name==="AbortError") return; }
  }
  setOverlay(dataUrl);
}

async function shareToWA(canvas, text, setToast, setOverlay) {
  await doShare(canvas, text, setToast, setOverlay);
  if (!navigator.share) setTimeout(()=>window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank"),1000);
}
async function shareToIG(canvas, setToast, setOverlay) {
  const dataUrl = canvas.toDataURL("image/png");
  setOverlay(dataUrl);
  setToast("salve a imagem → abra o Instagram → cole nos Stories 📸");
  setTimeout(()=>{
    const f=document.createElement("iframe");f.style.display="none";f.src="instagram://story-camera";
    document.body.appendChild(f);setTimeout(()=>document.body.removeChild(f),1200);
  },800);
}
async function shareToTT(canvas, setToast, setOverlay) {
  const dataUrl = canvas.toDataURL("image/png");
  setOverlay(dataUrl);
  setToast("salve a imagem → abra o TikTok → crie um novo vídeo 🎵");
}

// ── FINALE ─────────────────────────────────────────────
function FinaleScreen({data, mode, onReplay, onCaptureShare}) {
  const{sn1,sn2,total,days,s1,s2}=data;
  const[show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),100);return()=>clearTimeout(t);},[]);
  const isLove=mode==="love";
  const mColor=isLove?M:GREEN;

  const rizzWin=s1.rizz>s2.rizz?sn1:s2.rizz>s1.rizz?sn2:"empate";
  const fasterResp=s1.avgResp<s2.avgResp?sn1:s2.avgResp<s1.avgResp?sn2:"empate";
  const moreWords=s1.count>s2.count?sn1:sn2;
  const ghostWin=s1.maxSilence>s2.maxSilence?sn1:s2.maxSilence>s1.maxSilence?sn2:"empate";

  const stats=[
    {emoji:"💬",label:"msgs totais",value:total.toLocaleString("pt-BR"),delay:0.1},
    {emoji:"📅",label:"dias de papo",value:`${days}`,delay:0.2},
    {emoji:isLove?"💘":"💚",label:isLove?"mais rizz":"mais intenso/a",value:rizzWin,delay:0.3},
    {emoji:"⚡",label:"responde + rápido",value:fasterResp,delay:0.4},
    {emoji:"🗣️",label:"fala mais",value:moreWords,delay:0.5},
    {emoji:"👻",label:"some mais",value:ghostWin,delay:0.6},
  ];

  const roastFinal = s1.rizz>s2.rizz*1.5
    ? (isLove?`${sn1} tá claramente mais apaixonado/a 💘`:`${sn1} é o/a mais intenso/a dessa amizade 💚`)
    : s2.rizz>s1.rizz*1.5
    ? (isLove?`${sn2} tá claramente mais apaixonado/a 💘`:`${sn2} é o/a mais intenso/a dessa amizade 💚`)
    : isLove ? "conversa equilibrada — os dois estão nessa 🤝" : "amizade equilibrada — o caos é dividido igualmente 😂";

  const transO = {opacity:show?1:0,transition:"opacity 0.5s"};

  return(
    <div style={{width:"100%",height:"100%",background:`linear-gradient(155deg, ${mColor} 0%, ${PURPLE} 55%, ${B} 100%)`,
      display:"flex",flexDirection:"column",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
      {/* ── CARD (captured) ── */}
      <div id="finale-card" style={{padding:"28px 20px 16px",display:"flex",flexDirection:"column",gap:14,position:"relative",zIndex:1,
        background:`linear-gradient(155deg, ${mColor} 0%, ${PURPLE} 55%, ${B} 100%)`}}>

        {/* Blobs */}
        <div style={{position:"absolute",top:-60,right:-60,width:240,height:240,borderRadius:"50%",background:`${L}18`,pointerEvents:"none"}}/>

        {/* Header */}
        <div style={{textAlign:"center",...transO}}>
          <div style={{fontSize:32,marginBottom:6,animation:"float 3s ease-in-out infinite"}}>🎉</div>
          <div style={{...DIS,fontSize:60,color:W,lineHeight:0.85,marginBottom:2}}>ESSE É O</div>
          <div style={{...DIS,fontSize:60,color:L,lineHeight:0.85,marginBottom:12}}>RESULTADO</div>
          <div style={{...BOD,fontSize:16,fontWeight:900,color:W,marginBottom:2}}>{sn1} & {sn2}</div>
          <div style={{...BOD,fontSize:11,color:`${W}66`}}>{total.toLocaleString("pt-BR")} msgs · {days} dias · {isLove?"💘 modo love":"💚 modo amigo"}</div>
        </div>

        {/* Grid stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {stats.map(({emoji,label,value,delay},i)=>(
            <div key={i} style={{background:"rgba(255,255,255,0.12)",borderRadius:14,padding:"12px 10px",border:"1px solid rgba(255,255,255,0.18)",
              opacity:show?1:0,transform:show?"translateY(0)":"translateY(16px)",transition:`all 0.4s ${delay}s ease`}}>
              <div style={{fontSize:18,marginBottom:3}}>{emoji}</div>
              <div style={{...BOD,fontSize:9,color:`${W}66`,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>{label}</div>
              <div style={{...DIS,fontSize:18,color:W,lineHeight:1}}>{value}</div>
            </div>
          ))}
        </div>

        {/* Roast */}
        <div style={{background:"rgba(255,255,255,0.09)",borderRadius:14,padding:"12px 16px",
          border:`1px solid ${L}44`,textAlign:"center",...transO,transition:"opacity 0.5s 0.7s"}}>
          <div style={{...BOD,fontSize:14,fontWeight:700,color:W,lineHeight:1.5}}>{roastFinal}</div>
        </div>

        {/* Watermark */}
        <div style={{textAlign:"center",opacity:show?0.45:0,transition:"opacity 0.5s 1s"}}>
          <div style={{...BOD,fontSize:10,color:W,letterSpacing:2,fontWeight:700}}>{SITE}</div>
        </div>
      </div>

      {/* ── SHARE BUTTONS (NOT captured) ── */}
      <div style={{padding:"0 20px 48px",display:"flex",flexDirection:"column",gap:10,
        opacity:show?1:0,transition:"opacity 0.5s 0.9s"}}>
        <div style={{...BOD,fontSize:10,color:`${W}66`,textAlign:"center",letterSpacing:2,marginBottom:2,textTransform:"uppercase"}}>compartilhar resultado</div>

        {/* Save image — primary */}
        <button onClick={()=>onCaptureShare("save")}
          style={{...BOD,background:L,border:"none",color:B,borderRadius:14,padding:"15px 20px",
            cursor:"pointer",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",
            justifyContent:"center",gap:10,boxShadow:`0 4px 20px ${L}55`}}>
          <span style={{fontSize:18}}>📸</span> Salvar imagem
        </button>

        {/* Social row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <button onClick={()=>onCaptureShare("whatsapp")}
            style={{...BOD,background:"#25D366",border:"none",color:W,borderRadius:12,
              padding:"12px 6px",cursor:"pointer",fontSize:11,fontWeight:700,
              display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </button>

          <button onClick={()=>onCaptureShare("instagram")}
            style={{...BOD,background:"linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
              border:"none",color:W,borderRadius:12,padding:"12px 6px",cursor:"pointer",
              fontSize:11,fontWeight:700,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Instagram
          </button>

          <button onClick={()=>onCaptureShare("tiktok")}
            style={{...BOD,background:"#010101",border:"1px solid rgba(255,255,255,0.2)",
              color:W,borderRadius:12,padding:"12px 6px",cursor:"pointer",fontSize:11,fontWeight:700,
              display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>
            TikTok
          </button>
        </div>

        {/* Replay */}
        <button onClick={onReplay}
          style={{...BOD,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",
            color:W,borderRadius:14,padding:"12px 20px",cursor:"pointer",fontSize:13,fontWeight:700,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          ↩ Ver de novo
        </button>
      </div>
    </div>
  );
}

// ── UPLOAD ─────────────────────────────────────────────
function Upload({onData}) {
  const[mode,setMode]=useState(null); // 'love' | 'amigo'
  const[uiMode,setUiMode]=useState("select"); // 'select' | 'upload'
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const[progress,setProgress]=useState("");
  const[drag,setDrag]=useState(false);

  async function processFile(file) {
    if(!file||!mode) return;
    setLoading(true); setProgress("lendo arquivo...");
    try{
      const isZip=file.name.toLowerCase().endsWith(".zip")||file.type.includes("zip");
      if(isZip){
        setProgress("carregando JSZip...");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
        setProgress("descompactando...");
        const ab=await file.arrayBuffer();
        const zip=await window.JSZip.loadAsync(ab);
        const allKeys=Object.keys(zip.files);
        let chatFile=null;
        const allPaths=[];
        for(const key of allKeys){
          const f=zip.files[key];
          if(f.dir)continue;
          allPaths.push(key);
          const lo=key.toLowerCase();
          if(lo.endsWith("_chat.txt")||lo.endsWith("/chat.txt")||(lo.endsWith(".txt")&&!chatFile))chatFile=f;
        }
        if(!chatFile){setErr("Não achei o _chat.txt no ZIP.");setLoading(false);return;}
        setProgress("lendo conversa...");
        const chatTxt=await chatFile.async("string");
        const messages=parseTxt(chatTxt);
        setProgress("contando mídias...");
        const freq={};messages.forEach(m=>(freq[m.sender]=(freq[m.sender]||0)+1));
        const[zp1,zp2]=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([n])=>n);
        const zipResult=countZipMedia(allPaths,messages,zp1,zp2);
        setProgress(`encontrei ${zipResult.totalMediaFiles} mídias 🎙️${zipResult.totals.audio} · 🎭${zipResult.totals.sticker} · 📸${zipResult.totals.photo}`);
        await new Promise(r=>setTimeout(r,600));
        setProgress("analisando...");
        const result=analyze(messages,zipResult);
        if(!result){
          const f={};messages.forEach(m=>(f[m.sender]=(f[m.sender]||0)+1));
          setErr(`Precisa de 2 participantes. Encontrei ${Object.keys(f).length} pessoas.`);
          setLoading(false);return;
        }
        onData(result,mode);
      }else{
        setProgress("lendo conversa...");
        const text=await file.text();
        const messages=parseTxt(text);
        const result=analyze(messages,null);
        if(!result){setErr("Precisa de 2 participantes.");setLoading(false);return;}
        onData(result,mode);
      }
    }catch(e){setErr(`Erro: ${e.message}`);setLoading(false);}
  }

  const mConf = mode ? MODES[mode] : null;

  // STEP 1: mode selection
  if(uiMode==="select") return(
    <div style={{minHeight:"100vh",background:M,display:"flex",flexDirection:"column",overflowY:"auto"}}>
      {/* Ticker */}
      <div style={{overflow:"hidden",background:B,padding:"8px 0",flexShrink:0}}>
        <div style={{display:"flex",animation:"ticker 14s linear infinite",whiteSpace:"nowrap"}}>
          {Array(6).fill("✦ CHAT WRAPPED ✦ OS DADOS NÃO MENTEM ✦ QUEM SOME MAIS? ✦ QUEM TÁ MAIS DOIDO? ✦ ").map((t,i)=>(
            <span key={i} style={{...DIS,fontSize:16,color:L,paddingRight:28}}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{flex:1,padding:"24px 20px 32px",display:"flex",flexDirection:"column",gap:20}}>
        {/* Hero */}
        <div className="anim-pop">
          <div style={{...BOD,fontSize:11,letterSpacing:4,color:`${W}88`,textTransform:"uppercase",marginBottom:6}}>✦ para quem quer saber a verdade ✦</div>
          <div style={{...DIS,fontSize:80,color:W,lineHeight:0.82}}>CHAT</div>
          <div style={{...DIS,fontSize:80,color:L,lineHeight:0.82,marginBottom:10}}>WRAPPED</div>
          <div style={{...BOD,fontSize:15,color:`${W}cc`,fontStyle:"italic",lineHeight:1.4}}>a análise que ninguém pediu<br/>mas todo mundo precisa 💀</div>
        </div>

        {/* Mode selection */}
        <div className="anim-up2">
          <div style={{...BOD,fontSize:13,fontWeight:900,color:W,marginBottom:14,textAlign:"center",letterSpacing:1}}>
            ESTOU ANALISANDO MINHA CONVERSA COM…
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {Object.values(MODES).map(m=>(
              <button key={m.key} onClick={()=>{setMode(m.key);setUiMode("upload");}}
                style={{...BOD,background:B,border:`3px solid ${m.color}`,borderRadius:20,
                  padding:"24px 14px",cursor:"pointer",textAlign:"center",
                  boxShadow:`0 4px 20px ${m.color}44`,transition:"all 0.15s",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <span style={{fontSize:44,animation:"float 3s ease-in-out infinite"}}>{m.emoji}</span>
                <div style={{...DIS,fontSize:28,color:m.color}}>{m.label}</div>
                <div style={{...BOD,fontSize:11,color:`${W}66`,lineHeight:1.4}}>{m.sub}</div>
                <div style={{marginTop:6,background:m.color,borderRadius:99,padding:"5px 12px"}}>
                  <span style={{...BOD,fontSize:11,color:m.key==="love"?W:B,fontWeight:700}}>{m.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Preview tags */}
        <div className="anim-up3" style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
          {["👻 quem some","⚡ velocidade","🤡 delulu index","🌙 madrugada","🗣️ top palavras","✨ main character"].map(tag=>(
            <div key={tag} style={{background:`${W}18`,borderRadius:99,padding:"5px 12px",...BOD,fontSize:12,fontWeight:700,color:W,border:`1px solid ${W}25`}}>{tag}</div>
          ))}
        </div>
      </div>
    </div>
  );

  // STEP 2: upload
  return(
    <div style={{minHeight:"100vh",background:mConf.bg,display:"flex",flexDirection:"column",overflowY:"auto",border:`4px solid ${mConf.color}`}}>
      <div style={{overflow:"hidden",background:B,padding:"8px 0",flexShrink:0}}>
        <div style={{display:"flex",animation:"ticker 14s linear infinite",whiteSpace:"nowrap"}}>
          {Array(6).fill(`✦ CHAT WRAPPED ✦ MODO ${mConf.label.toUpperCase()} ${mConf.emoji} ✦ `).map((t,i)=>(
            <span key={i} style={{...DIS,fontSize:16,color:mConf.color,paddingRight:28}}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{flex:1,padding:"20px 20px 32px",display:"flex",flexDirection:"column",gap:18}}>
        {/* Back + mode badge */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={()=>{setMode(null);setUiMode("select");setErr("");}}
            style={{...BOD,background:`${W}15`,border:"none",color:W,borderRadius:99,padding:"8px 16px",cursor:"pointer",fontSize:13,fontWeight:700}}>
            ← trocar
          </button>
          <div style={{background:mConf.color,borderRadius:99,padding:"6px 16px",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:18}}>{mConf.emoji}</span>
            <span style={{...DIS,fontSize:20,color:mConf.key==="love"?W:B}}>{mConf.label}</span>
          </div>
        </div>

        <div>
          <div style={{...DIS,fontSize:72,color:W,lineHeight:0.82}}>CHAT</div>
          <div style={{...DIS,fontSize:72,color:mConf.color,lineHeight:0.82,marginBottom:8}}>WRAPPED</div>
          <div style={{...BOD,fontSize:14,color:`${W}88`,fontStyle:"italic"}}>{mConf.desc}</div>
        </div>

        {/* Upload zone */}
        <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);processFile(e.dataTransfer.files[0]);}}
          onClick={()=>!loading&&document.getElementById("fup").click()}
          style={{border:`2.5px dashed ${drag?mConf.color:`${W}55`}`,borderRadius:20,
            padding:"28px 20px",textAlign:"center",cursor:loading?"wait":"pointer",
            background:drag?`${mConf.color}18`:`${W}08`,transition:"all 0.2s"}}>
          {loading?(
            <div>
              <div style={{fontSize:34,animation:"spin 1s linear infinite",display:"inline-block",marginBottom:10}}>⚡</div>
              <div style={{...BOD,fontWeight:900,color:mConf.color,fontSize:14,letterSpacing:1,marginBottom:6}}>PROCESSANDO...</div>
              <div style={{...BOD,color:`${W}88`,fontSize:13,lineHeight:1.5}}>{progress}</div>
            </div>
          ):(
            <>
              <div style={{display:"flex",justifyContent:"center",gap:18,marginBottom:12}}><IconZip/><IconTxt/></div>
              <div style={{...BOD,fontWeight:900,fontSize:16,color:W,marginBottom:3}}>solte o .zip ou .txt aqui</div>
              <div style={{...BOD,fontSize:13,color:`${W}66`}}>ou clique para escolher</div>
              {err&&<div style={{...BOD,color:mConf.color,fontSize:13,marginTop:10,fontWeight:700,background:`${B}55`,borderRadius:10,padding:"8px 12px"}}>{err}</div>}
            </>
          )}
        </div>
        <input id="fup" type="file" accept=".txt,.zip" style={{display:"none"}} onChange={e=>processFile(e.target.files[0])}/>

        {/* How to */}
        <div style={{background:`${W}08`,borderRadius:18,padding:"16px 18px",border:`1px solid ${W}15`}}>
          <div style={{...BOD,fontSize:12,fontWeight:900,letterSpacing:3,color:mConf.color,textTransform:"uppercase",marginBottom:12}}>📱 como exportar</div>
          <div style={{display:"flex",flexDirection:"column",gap:9,marginBottom:14}}>
            {["Abra a conversa no WhatsApp","Toque nos 3 pontinhos ⋮",'Mais → "Exportar conversa"',"Escolha o tipo:"].map((t,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{...DIS,fontSize:22,color:mConf.color,width:24,flexShrink:0}}>{i+1}</div>
                <div style={{...BOD,fontSize:14,color:W,fontWeight:600,lineHeight:1.4}}>{t}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1,background:`${W}10`,borderRadius:12,padding:"12px",border:`1px solid ${W}18`}}>
              <div style={{...DIS,fontSize:20,color:L,marginBottom:3}}>SEM MÍDIA</div>
              <div style={{...BOD,fontSize:12,color:W,lineHeight:1.4}}>gera <strong>.txt</strong><br/>análise básica</div>
            </div>
            <div style={{flex:1,background:`${M}22`,borderRadius:12,padding:"12px",border:`2px solid ${M}55`,position:"relative"}}>
              <div style={{position:"absolute",top:-10,right:8,background:M,color:W,fontSize:9,fontWeight:900,padding:"2px 8px",borderRadius:99}}>RECOMENDADO</div>
              <div style={{...DIS,fontSize:20,color:M,marginBottom:3}}>INCLUIR MÍDIA</div>
              <div style={{...BOD,fontSize:12,color:W,lineHeight:1.4}}>gera <strong>.zip</strong><br/>dados completos 📦</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{...BOD,textAlign:"center",fontSize:11,color:`${W}33`,padding:"4px 20px 20px"}}>🔒 zero dados enviados — tudo no seu celular</div>
    </div>
  );
}

// ── APP ─────────────────────────────────────────────────
export default function App() {
  const[data,setData]=useState(null);
  const[mode,setMode]=useState("love");
  const[slides,setSlides]=useState([]);
  const[cur,setCur]=useState(0);
  const[showFinale,setShowFinale]=useState(false);
  const[key,setKey]=useState(0);
  const[toast,setToast]=useState(null);
  const[sharing,setSharing]=useState(false);
  const[imgOverlay,setImgOverlay]=useState(null);
  const slideRef=useRef(null);
  const finaleRef=useRef(null);
  const touchStart=useRef(null);

  function onData(d,m){setData(d);setMode(m);setSlides(buildSlides(d,m));setCur(0);setShowFinale(false);setKey(k=>k+1);}
  const next=()=>{if(cur<slides.length-1){setCur(c=>c+1);setKey(k=>k+1);}else setShowFinale(true);};
  const prev=()=>{if(cur>0){setCur(c=>c-1);setKey(k=>k+1);}};
  function handleTap(e){const x=e.clientX||0,w=e.currentTarget.offsetWidth;if(x>w*0.35)next();else prev();}
  function handleTS(e){touchStart.current=e.touches[0].clientX;}
  function handleTE(e){const dx=e.changedTouches[0].clientX-(touchStart.current||0);if(Math.abs(dx)>50)dx<0?next():prev();touchStart.current=null;}
  function showToast(msg){setToast(msg);setTimeout(()=>setToast(null),3500);}

  const mConf=MODES[mode]||MODES.love;
  const isLast=cur===slides.length-1;

  async function shareSlide(e){
    e.stopPropagation();
    if(sharing||!slideRef.current)return;
    setSharing(true);showToast("gerando imagem... ⚡");
    try{
      const canvas=await captureEl(slideRef.current);
      const text=`${mConf.shareTag} e olha o que os dados revelaram 👀\n${SITE}`;
      await doShare(canvas,text,showToast,setImgOverlay);
    }catch(e){showToast(`erro: ${e.message}`);}
    setSharing(false);
  }

  async function handleFinaleShare(platform){
    if(sharing)return;
    setSharing(true);showToast("gerando imagem... ⚡");
    try{
      const card=document.getElementById("finale-card");
      const canvas=await captureEl(card||finaleRef.current);
      const text=`${mConf.shareTag} e os dados não mentem 👀\n${data?.total?.toLocaleString("pt-BR")} msgs · ${data?.days} dias\n${SITE}`;
      if(platform==="whatsapp")await shareToWA(canvas,text,showToast,setImgOverlay);
      else if(platform==="instagram")await shareToIG(canvas,showToast,setImgOverlay);
      else if(platform==="tiktok")await shareToTT(canvas,showToast,setImgOverlay);
      else await doShare(canvas,text,showToast,setImgOverlay);
    }catch(e){showToast(`erro: ${e.message}`);}
    setSharing(false);
  }

  if(!data) return <Upload onData={onData}/>;

  return(
    <div style={{width:"100vw",height:"100vh",overflow:"hidden",position:"relative",background:B}}>
      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",bottom:88,left:"50%",transform:"translateX(-50%)",
          background:L,color:B,padding:"10px 24px",borderRadius:99,...BOD,fontWeight:900,fontSize:14,
          zIndex:999,animation:"pop 0.3s ease",whiteSpace:"nowrap",
          boxShadow:`0 4px 24px ${L}55`,maxWidth:"88vw",textAlign:"center"}}>
          {toast}
        </div>
      )}

      {/* Image overlay — iOS save */}
      {imgOverlay&&(
        <div onClick={()=>setImgOverlay(null)} style={{position:"fixed",inset:0,zIndex:300,
          background:"rgba(0,0,0,0.93)",display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{...BOD,color:W,fontSize:14,fontWeight:700,marginBottom:14,textAlign:"center",lineHeight:1.7}}>
            <span style={{fontSize:24}}>📱</span><br/>
            <strong>iPhone:</strong> pressione e segure a imagem<br/>→ "Adicionar à Fototeca"<br/>
            <span style={{opacity:0.5,fontSize:12}}>depois manda onde quiser</span>
          </div>
          <img src={imgOverlay} alt="Chat Wrapped"
            style={{maxWidth:"100%",maxHeight:"62vh",borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,0.6)"}}/>
          <button onClick={()=>setImgOverlay(null)}
            style={{...BOD,marginTop:18,background:`${W}18`,border:"none",color:W,
              borderRadius:99,padding:"10px 28px",cursor:"pointer",fontWeight:700,fontSize:14}}>
            fechar ✕
          </button>
        </div>
      )}

      {showFinale?(
        <div ref={finaleRef} style={{width:"100%",height:"100%",overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
          <FinaleScreen data={data} mode={mode} onReplay={()=>{setCur(0);setShowFinale(false);setKey(k=>k+1);}} onCaptureShare={handleFinaleShare}/>
          <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:20,
            display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"8px 16px 24px",background:"linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 100%)"}}>
            <button onClick={()=>setData(null)} style={{...BOD,background:"rgba(255,255,255,0.1)",border:"none",color:W,borderRadius:99,padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>← novo</button>
            <div/>
          </div>
        </div>
      ):(
        <>
          <div ref={slideRef} key={key} onClick={handleTap} onTouchStart={handleTS} onTouchEnd={handleTE}
            style={{width:"100%",height:"100%",position:"relative",animation:"fadeIn 0.2s ease"}}>
            {slides[cur]&&<Slide slide={slides[cur]} sn1={data.sn1} sn2={data.sn2} idx={cur} total={slides.length}/>}
          </div>

          <div id="slide-nav" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:20,
            display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"10px 16px 28px",
            background:"linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 100%)",gap:8}}>
            <button onClick={e=>{e.stopPropagation();setData(null);}}
              style={{...BOD,background:"rgba(255,255,255,0.12)",border:"none",color:W,borderRadius:99,padding:"9px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>← novo</button>
            <div style={{display:"flex",gap:8}}>
              <button onClick={e=>{e.stopPropagation();prev();}} disabled={cur===0}
                style={{background:"rgba(255,255,255,0.12)",border:"none",color:cur===0?"rgba(255,255,255,0.2)":W,borderRadius:99,width:42,height:42,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
              <button onClick={e=>{e.stopPropagation();next();}}
                style={{background:isLast?L:"rgba(255,255,255,0.12)",border:"none",
                  color:isLast?B:W,borderRadius:99,width:42,height:42,cursor:"pointer",
                  fontSize:isLast?16:20,display:"flex",alignItems:"center",justifyContent:"center",
                  fontWeight:900,boxShadow:isLast?`0 2px 16px ${L}77`:"none",
                  transition:"all 0.3s"}}>
                {isLast?"🎉":"›"}
              </button>
            </div>
            <button onClick={shareSlide}
              style={{...BOD,background:sharing?"rgba(255,255,255,0.08)":M,border:"none",color:W,
                borderRadius:99,padding:"9px 16px",cursor:sharing?"not-allowed":"pointer",
                fontSize:13,fontWeight:900,display:"flex",alignItems:"center",gap:5,
                boxShadow:sharing?"none":`0 2px 16px ${M}66`,transition:"all 0.2s"}}>
              {sharing?"⏳":"📸"} {sharing?"gerando...":"salvar"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
