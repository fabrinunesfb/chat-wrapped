import { useState, useRef, useEffect } from "react";

// ── UTILS ──────────────────────────────────────────────
const loadScript = src => new Promise(res => {
  if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
  const s = document.createElement("script"); s.src = src; s.onload = res;
  document.head.appendChild(s);
});

// ── FONTS & CSS ────────────────────────────────────────
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
  @keyframes countUp{from{opacity:0;transform:scale(1.3)}to{opacity:1;transform:scale(1)}}
  @keyframes gradMove{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
  .anim-pop{animation:pop 0.5s cubic-bezier(.17,.67,.35,1.3) forwards}
  .anim-up1{animation:slideUp 0.4s ease forwards}
  .anim-up2{animation:slideUp 0.4s 0.13s ease forwards;opacity:0}
  .anim-up3{animation:slideUp 0.4s 0.25s ease forwards;opacity:0}
  .anim-up4{animation:slideUp 0.4s 0.36s ease forwards;opacity:0}
  .finale-num{animation:countUp 0.6s ease forwards;opacity:0}
`;
document.head.appendChild(_st);

// ── PALETTE ────────────────────────────────────────────
const M="#ff2d78", L="#c8f400", B="#0a0a0a", W="#ffffff";
const PURPLE="#7b2fff", TEAL="#00d4c8";
const DIS={fontFamily:"'Bebas Neue',sans-serif"};
const BOD={fontFamily:"'DM Sans',sans-serif"};

// ── SVG ICONS ──────────────────────────────────────────
const IconZip = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <rect x="6" y="4" width="28" height="36" rx="4" fill={W} fillOpacity="0.15" stroke={W} strokeOpacity="0.4" strokeWidth="1.5"/>
    <path d="M24 8v4M28 8v4M24 12h4" stroke={L} strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="6" y="28" width="28" height="12" rx="3" fill={M}/>
    <text x="20" y="37.5" fontSize="7" fontFamily="monospace" fill={W} fontWeight="bold" textAnchor="middle">.zip</text>
  </svg>
);
const IconTxt = () => (
  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
    <rect x="8" y="4" width="28" height="36" rx="4" fill={W} fillOpacity="0.15" stroke={W} strokeOpacity="0.4" strokeWidth="1.5"/>
    <line x1="14" y1="22" x2="30" y2="22" stroke={W} strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="14" y1="27" x2="30" y2="27" stroke={W} strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="14" y1="32" x2="24" y2="32" stroke={W} strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    <rect x="8" y="28" width="20" height="12" rx="3" fill={L}/>
    <text x="18" y="37.5" fontSize="7" fontFamily="monospace" fill={B} fontWeight="bold" textAnchor="middle">.txt</text>
  </svg>
);

// ── PARSE ──────────────────────────────────────────────
// Universal parser — handles ALL WhatsApp export formats:
// [DD/MM/YYYY, HH:MM:SS] Sender: msg    → iOS Brazil (brackets, 24h)
// [M/D/YY, H:MM:SS AM] Sender: msg      → iOS US/EN (brackets, 12h)
// DD/MM/YYYY, HH:MM - Sender: msg       → Android Brazil (dash, 24h)
// M/D/YY, H:MM AM - Sender: msg         → Android US (dash, 12h)
// DD.MM.YYYY, HH:MM - Sender: msg       → Android Germany/EU (dots)
// DD/MM/YYYY HH:MM - Sender: msg        → no-comma variant
function parseTxt(raw) {
  const clean = raw.replace(/[\u200e\u200f\u202a-\u202e\ufeff\u00a0]/g, "");
  const lines = clean.split(/\r?\n/);

  // Matches: optional [ + date + optional , + time + optional AM/PM + ] or - or space + sender + : + content
  const MSG_RE = /^\[?(\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\s*[\]\-:]\s*([^:]{1,80}):\s*([\s\S]*)/;
  const SYS_RE = /mensagens e ligações|messages and calls|end-to-end|está na sua lista|added you|created this group|changed the|you're now|security code|notifications about|cifrado|criptograf/i;

  function parseDate(ds, ts) {
    const d = ds.replace(/[.\-]/g, "/");
    const [a, b, c] = d.split("/");
    const yr = c.length <= 2 ? 2000 + +c : +c;
    // DD/MM vs MM/DD: if first part > 12 → day first (Brazil/EU)
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

// ── ZIP MEDIA COUNTER ──────────────────────────────────
// WhatsApp exports ZIPs with files at root OR in a subfolder like "WhatsApp Chat - Name/"
// We count all media files regardless of path depth.
function countZipMedia(zipPaths, messages, p1, p2) {
  const by1 = messages.filter(m=>m.sender===p1);
  const by2 = messages.filter(m=>m.sender===p2);

  // Count ALL media by extension — path-independent
  const totals = {audio:0, sticker:0, photo:0, video:0};
  zipPaths.forEach(path => {
    const lower = path.toLowerCase();
    if (/\.(opus|mp3|aac|m4a|oga|ogg|wav)$/.test(lower)) { totals.audio++; return; }
    if (/\.webp$/.test(lower))                             { totals.sticker++; return; }
    if (/\.(jpe?g|png|gif|heic|heif)$/.test(lower))       { totals.photo++; return; }
    if (/\.(mp4|mov|3gp|mkv|avi)$/.test(lower))           { totals.video++; return; }
  });

  const totalMediaFiles = totals.audio + totals.sticker + totals.photo + totals.video;

  // Distribute per sender using txt-detected ratios as proxy
  const msgRatio = by1.length / Math.max(by1.length + by2.length, 1);
  const result = {
    [p1]:{audio:0,sticker:0,photo:0,video:0},
    [p2]:{audio:0,sticker:0,photo:0,video:0},
  };
  ["audio","sticker","photo","video"].forEach(type => {
    const total = totals[type];
    if (!total) return;
    const t1 = by1.filter(m=>m.mediaType===type).length;
    const t2 = by2.filter(m=>m.mediaType===type).length;
    const sum = t1 + t2;
    const ratio = sum > 0 ? t1/sum : msgRatio;
    result[p1][type] = Math.round(ratio * total);
    result[p2][type] = total - result[p1][type];
  });

  return {counts:result, totals, totalMediaFiles};
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

  const RIZZ=["amor","linda","lindo","gostosa","gostoso","saudade","beijo","meu bem","gatinha","gatinho","fofa","fofo","perfeita","perfeito","maravilhosa","maravilhoso","meu gato","neném","te amo","meu anjo","meu tudo","meu amor"];
  function rizz(msgs){const t=msgs.map(m=>m.content.toLowerCase()).join(" ");return RIZZ.reduce((a,w)=>a+(t.split(w).length-1),0);}

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

  const STOP=new Set(["que","de","o","a","e","é","em","um","uma","com","para","não","se","na","no","do","da","os","as","eu","você","me","te","nos","ele","ela","isso","esse","essa","mas","por","mais","como","seu","sua","seus","suas","então","mas","pra","pro","muito","bem","só","vc","sim","não","vou","vai","faz","ter","mano","gente","cara","acho","também","assim","quem","onde","quando","ainda","até","depois","antes","hoje","ontem","agora","aqui","ai","ah","oh","hm","oi","ola","olá","ok","rs","kk","haha","kkk","né","né","ta","tá","foi","ser","tem","essa","minha","meu","tudo","todo","toda","coisa","aqui","isso"]);
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

  const zipInfo=zipResult?`📦 ${zipResult.totalMediaFiles} mídias no ZIP — 🎙️${zipResult.totals.audio} áudios · 🎭${zipResult.totals.sticker} stickers · 📸${zipResult.totals.photo} fotos · 🎬${zipResult.totals.video} vídeos`:null;

  function stats(msgs,p,other){
    return{
      count:msgs.length,
      audio:media(p,"audio",msgs),
      sticker:media(p,"sticker",msgs),
      photo:media(p,"photo",msgs),
      video:media(p,"video",msgs),
      deleted:msgs.filter(m=>m.isDeleted).length,
      questions:msgs.filter(m=>m.content.includes("?")).length,
      emojiCount:(msgs.map(m=>m.content).join("").match(EMOJI)||[]).length,
      topEmojis:topEmojis(msgs),
      rizz:rizz(msgs),
      laugh:laughStyle(msgs),
      caps:caps(msgs),
      delulu:delulu(p),
      avgResp:rtAvg(other,p),
      maxSilence:maxSil(other,p),
      initiates:inits[p],
      closesDay:closes[p],
      maxStreak:maxStreak(p),
      peakHour:peakHour(msgs),
      nightMsgs:nightMsgs(msgs),
      topWords:topWords(msgs),
      mainCharScore:mainCharScore(msgs),
      hourSpark:hourSpark(msgs),
    };
  }

  const busy=busiestDay();
  return{p1,p2,sn1,sn2,total:messages.length,days,hasZip:zipHasData,zipInfo,s1:stats(by1,p1,p2),s2:stats(by2,p2,p1),busiestDay:busy};
}

// ── HELPERS ────────────────────────────────────────────
const fmtMin=m=>!m?"<1min":m<60?`${m}min`:`${Math.floor(m/60)}h${m%60?m%60+"min":""}`;
const fmtH=h=>h===0?"meia-noite":h<12?`${h}h da manhã`:h===12?"12h":h<18?`${h}h da tarde`:`${h}h da noite`;
const winOf=(v1,v2,h=true)=>h?(v1>v2?1:v2>v1?2:0):(v1<v2?1:v2<v1?2:0);

// ── BUILD SLIDES ───────────────────────────────────────
function buildSlides(d) {
  const{sn1,sn2,total,days,s1,s2,busiestDay,hasZip,zipInfo}=d;
  const W2=(v1,v2,h=true)=>winOf(v1,v2,h);

  return [
    {id:"intro",bg:B,accent:L,type:"INTRO",sub:`${sn1} & ${sn2}`,detail:`${total.toLocaleString("pt-BR")} msgs · ${days} dias${hasZip?" · 📦 mídia incluída":""}`},
    {id:"msgs",bg:M,accent:W,type:"VERSUS",headline:"QUEM\nFALA MAIS?",n1:s1.count,n2:s2.count,unit:"msgs",winner:W2(s1.count,s2.count),roast:s1.count>s2.count?`${sn1} simplesmente não para. é amor ou só insônia? 🫠`:s2.count>s1.count?`${sn2} simplesmente não para. é amor ou só insônia? 🫠`:`empatados — os dois igualmente verborrágicos 😭`},
    {id:"resp",bg:B,accent:L,type:"VERSUS",headline:"VELOCIDADE\nDE RESPOSTA",n1:fmtMin(s1.avgResp),n2:fmtMin(s2.avgResp),unit:"média",winner:W2(s1.avgResp,s2.avgResp,false),roast:(()=>{const f=W2(s1.avgResp,s2.avgResp,false);if(!f)return"os dois ficam com o celular na mão. sabemos.";const fn=f===1?sn1:sn2;return`${fn} responde mais rápido. a.k.a. mais ansioso/a 👀`;})()},
    {id:"ghost",bg:PURPLE,accent:W,type:"GHOST",headline:"MAIOR\nVACILO 👻",n1:fmtMin(s1.maxSilence),n2:fmtMin(s2.maxSilence),winner:W2(s1.maxSilence,s2.maxSilence,false),roast:(()=>{const g=W2(s1.maxSilence,s2.maxSilence,true);const nm=g===1?sn1:g===2?sn2:null;if(!nm)return"os dois somem igual. parceria de fantasmas 👻";return`${nm} ficou ${fmtMin(Math.max(s1.maxSilence,s2.maxSilence))} sem responder 👻`;})()},
    {id:"night",bg:B,accent:M,type:"NIGHT",headline:"MADRUGADA\nCOMPULSIVA 🌙",n1:s1.nightMsgs,n2:s2.nightMsgs,peak1:fmtH(s1.peakHour),peak2:fmtH(s2.peakHour),winner:W2(s1.nightMsgs,s2.nightMsgs),roast:(()=>{const n=W2(s1.nightMsgs,s2.nightMsgs);const nm=n===1?sn1:n===2?sn2:null;if(!nm||Math.max(s1.nightMsgs,s2.nightMsgs)===0)return"os dois dormem em paz. gente saudável.";return`${nm} mandou ${Math.max(s1.nightMsgs,s2.nightMsgs)} msgs entre 0h e 5h 🌙`;})()},
    {id:"init",bg:M,accent:W,type:"VERSUS",headline:"QUEM COMEÇA\nSEMPRE?",n1:s1.initiates,n2:s2.initiates,unit:"dias",winner:W2(s1.initiates,s2.initiates),roast:(()=>{const ini=W2(s1.initiates,s2.initiates);const nm=ini===1?sn1:ini===2?sn2:null;if(!nm)return"os dois começam igual. raro.";return`${nm} começa quase todo dia. coragem ou dependência? ✨`;})()},
    {id:"rizz",bg:L,accent:B,type:"SCORE",headline:"RIZZ\nSCORE 💘",dark:true,scores:[{name:sn1,val:s1.rizz,max:Math.max(s1.rizz,s2.rizz,1)},{name:sn2,val:s2.rizz,max:Math.max(s1.rizz,s2.rizz,1)}],sub:"amor · saudade · neném · beijo · fofo…",barColors:[M,PURPLE],roast:(()=>{const r=W2(s1.rizz,s2.rizz);if(!r)return"zero rizz dos dois. relacionamento baseado no quê?";const nm=r===1?sn1:sn2;const other=nm===sn1?sn2:sn1;return`${nm} derrama afeto e ${other} responde com sticker 💀`;})()},
    {id:"delulu",bg:B,accent:M,type:"SCORE",headline:"DELULU\nINDEX 🤡",scores:[{name:sn1,val:s1.delulu,max:Math.max(s1.delulu,s2.delulu,1)},{name:sn2,val:s2.delulu,max:Math.max(s1.delulu,s2.delulu,1)}],sub:"rajadas de 3+ msgs seguidas sem resposta",barColors:[L,TEAL],roast:(()=>{const dl=W2(s1.delulu,s2.delulu);if(!dl)return"os dois são delulus iguais. casal perfeito.";const nm=dl===1?sn1:sn2;return`${nm} mandou ${Math.max(s1.delulu,s2.delulu)}x seguido sem resposta 🤡`;})()},
    {id:"deleted",bg:PURPLE,accent:W,type:"DELETED",headline:"MSGS\nAPAGADAS 🗑️",n1:s1.deleted,n2:s2.deleted,winner:W2(s1.deleted,s2.deleted,false),roast:(()=>{const dl=W2(s1.deleted,s2.deleted,true);const nm=dl===1?sn1:dl===2?sn2:null;if(!nm||(s1.deleted===0&&s2.deleted===0))return"ninguém apagou nada. ou corajosos ou não sentem nada.";return`${nm} apagou ${Math.max(s1.deleted,s2.deleted)} msgs 🕵️ o que escondia?`;})()},
    {id:"media",bg:L,accent:B,type:"MEDIA",headline:"MÍDIAS\nENVIADAS",dark:true,zipInfo,rows:[{label:"🎙️ áudios",v1:s1.audio,v2:s2.audio},{label:"🎭 stickers",v1:s1.sticker,v2:s2.sticker},{label:"📸 fotos",v1:s1.photo,v2:s2.photo},{label:"🎬 vídeos",v1:s1.video,v2:s2.video}],roast:s1.audio>s2.audio*2?`${sn1} vive de áudio. quem ouve merece prêmio 🎙️`:s2.audio>s1.audio*2?`${sn2} vive de áudio. quem ouve merece prêmio 🎙️`:s1.sticker>s2.sticker*2?`${sn1} prefere sticker a palavras.`:s2.sticker>s1.sticker*2?`${sn2} prefere sticker a palavras.`:"dois grandes produtores de conteúdo. instagram já vai ligar."},
    {id:"words",bg:M,accent:W,type:"WORDS",headline:"TOP PALAVRAS\nDA CONVERSA 🗣️",w1:s1.topWords,w2:s2.topWords,roast:"as palavras mais usadas não mentem. nem tentam esconder."},
    {id:"laugh",bg:B,accent:L,type:"LAUGH",headline:"ESTILO\nDE RISO 😂",items:[{name:sn1,...s1.laugh},{name:sn2,...s2.laugh}],roast:"o riso é a alma exposta. não tem como fingir."},
    {id:"main",bg:PURPLE,accent:L,type:"MAINCHAR",headline:"MAIN\nCHARACTER ✨",s1mc:s1.mainCharScore,s2mc:s2.mainCharScore,roast:(()=>{const d=Math.abs(s1.mainCharScore-s2.mainCharScore);if(d<10)return"os dois falam de si mesmos igual. equilíbrio raro.";const nm=s1.mainCharScore>s2.mainCharScore?sn1:sn2;return`${nm} é o/a protagonista dessa história ✨`;})()},
    {id:"busyday",bg:L,accent:B,type:"BUSYDAY",dark:true,headline:"DIA MAIS\nMALUCO 🔥",day:busiestDay.day,count:busiestDay.count,roast:`${busiestDay.count} mensagens em um dia só. o que aconteceu ali???`},
    {id:"emojis",bg:B,accent:L,type:"EMOJIS",headline:"TOP\nEMOJIS ✨",items:[{name:sn1,emojis:s1.topEmojis},{name:sn2,emojis:s2.topEmojis}],roast:"os emojis são sua assinatura emocional."},
    {id:"hours",bg:M,accent:W,type:"HOURS",headline:"QUANDO MAIS\nATIVOS?",spark1:s1.hourSpark,spark2:s2.hourSpark,peak1:fmtH(s1.peakHour),peak2:fmtH(s2.peakHour),roast:`pico: ${sn1} às ${fmtH(s1.peakHour)} · ${sn2} às ${fmtH(s2.peakHour)}`},
    {id:"verdict",bg:B,accent:L,type:"VERDICT",headline:"VEREDITO\nFINAL 🏆",items:(()=>{const v=[];if(s1.rizz>s2.rizz*1.5)v.push(`💘 ${sn1} está claramente mais apaixonado/a`);if(s2.rizz>s1.rizz*1.5)v.push(`💘 ${sn2} está claramente mais apaixonado/a`);if(s1.avgResp<s2.avgResp*0.6)v.push(`⚡ ${sn1} responde mais rápido — tá ansioso/a`);if(s2.avgResp<s1.avgResp*0.6)v.push(`⚡ ${sn2} responde mais rápido — tá ansioso/a`);if(s1.deleted>s2.deleted+2)v.push(`🗑️ ${sn1} apagou ${s1.deleted} msgs — escondendo algo`);if(s2.deleted>s1.deleted+2)v.push(`🗑️ ${sn2} apagou ${s2.deleted} msgs — escondendo algo`);if(s1.initiates>s2.initiates*1.5)v.push(`🌅 ${sn1} começa quase tudo — tá doido/a`);if(s2.initiates>s1.initiates*1.5)v.push(`🌅 ${sn2} começa quase tudo — tá doido/a`);if(s1.nightMsgs>s2.nightMsgs*2&&s1.nightMsgs>5)v.push(`🌙 ${sn1} vive de madrugada`);if(s2.nightMsgs>s1.nightMsgs*2&&s2.nightMsgs>5)v.push(`🌙 ${sn2} vive de madrugada`);if(!v.length)v.push("🤝 conversa equilibrada — os dois igualmente delusionais");return v;})(),sub:`${total.toLocaleString("pt-BR")} msgs · ${days} dias`},
  ];
}

// ── COMPONENTS ─────────────────────────────────────────
function ProgressBar({idx,total,color}){
  return(
    <div style={{display:"flex",gap:4,padding:"14px 16px 0",flexShrink:0}}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} style={{flex:1,height:3,borderRadius:99,background:i<=idx?color:`${color}33`,transition:"background 0.3s"}}/>
      ))}
    </div>
  );
}

function Roast({text,textC,accent}){
  return(
    <div className="anim-up4" style={{background:`${textC}12`,borderLeft:`4px solid ${accent}`,borderRadius:"0 14px 14px 0",padding:"14px 16px",flexShrink:0}}>
      <div style={{...BOD,fontSize:16,fontWeight:700,color:textC,lineHeight:1.55}}>{text}</div>
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
  const SPACER=92;
  const PB=<ProgressBar idx={idx} total={total} color={accent}/>;

  if(type==="INTRO") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-80,right:-80,width:280,height:280,borderRadius:"50%",border:`2px solid ${accent}22`}}/>
      <div style={{position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",border:`2px solid ${accent}38`}}/>
      <div style={{position:"absolute",bottom:120,left:-60,width:220,height:220,borderRadius:"50%",background:`${M}1a`}}/>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"20px 24px 16px"}}>
        <div className="anim-pop">
          <div style={{...BOD,fontSize:11,letterSpacing:4,color:`${accent}66`,textTransform:"uppercase",marginBottom:10}}>✦ análise completa ✦</div>
          <div style={{...DIS,fontSize:100,color:accent,lineHeight:0.82}}>CHAT</div>
          <div style={{...DIS,fontSize:100,color:M,lineHeight:0.82,marginBottom:20}}>WRAPPED</div>
        </div>
        <div className="anim-up2" style={{borderTop:`1px solid ${accent}28`,paddingTop:18}}>
          <div style={{...BOD,fontSize:26,fontWeight:900,color:textC,letterSpacing:-0.5,marginBottom:6}}>{slide.sub}</div>
          <div style={{...BOD,fontSize:14,color:subC,fontWeight:600}}>{slide.detail}</div>
        </div>
      </div>
      <div className="anim-up3" style={{padding:"0 24px 36px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{...BOD,fontSize:12,color:`${accent}55`,letterSpacing:2,animation:"blink 2s infinite"}}>TAP PARA COMEÇAR</div>
        <div style={{...BOD,fontSize:15,color:accent,animation:"blink 2s 0.5s infinite"}}>→</div>
      </div>
    </div>
  );

  if(type==="VERSUS"){
    const isNum=typeof slide.n1==="number",w=slide.winner;
    return(
      <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
        {PB}
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
          <div className="anim-up1" style={{...DIS,fontSize:52,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
          <div className="anim-up2" style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{...BOD,fontSize:11,fontWeight:700,color:subC,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{sn1}</div>
              <div style={{...DIS,fontSize:isNum?80:50,color:w===1?accent:`${textC}44`,lineHeight:1}}>{slide.n1}</div>
              {slide.unit&&<div style={{...BOD,fontSize:12,color:subC,marginTop:2}}>{slide.unit}</div>}
              {w===1&&<div style={{fontSize:20,marginTop:4}}>👑</div>}
            </div>
            <div style={{...DIS,fontSize:20,color:`${textC}28`}}>VS</div>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{...BOD,fontSize:11,fontWeight:700,color:subC,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{sn2}</div>
              <div style={{...DIS,fontSize:isNum?80:50,color:w===2?accent:`${textC}44`,lineHeight:1}}>{slide.n2}</div>
              {slide.unit&&<div style={{...BOD,fontSize:12,color:subC,marginTop:2}}>{slide.unit}</div>}
              {w===2&&<div style={{fontSize:20,marginTop:4}}>👑</div>}
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
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
          <div className="anim-up1" style={{...DIS,fontSize:52,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
          <div className="anim-up2" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{...BOD,fontSize:11,color:subC,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{sn1}</div>
              <div style={{...DIS,fontSize:52,color:w===1?accent:`${textC}44`,lineHeight:1,animation:w===1?"shake 0.6s 0.5s":"none"}}>{slide.n1}</div>
              {w===1&&<div style={{fontSize:18,marginTop:4}}>👻</div>}
            </div>
            <div style={{fontSize:52,animation:"float 3s ease-in-out infinite"}}>👻</div>
            <div style={{flex:1,textAlign:"center"}}>
              <div style={{...BOD,fontSize:11,color:subC,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{sn2}</div>
              <div style={{...DIS,fontSize:52,color:w===2?accent:`${textC}44`,lineHeight:1,animation:w===2?"shake 0.6s 0.5s":"none"}}>{slide.n2}</div>
              {w===2&&<div style={{fontSize:18,marginTop:4}}>👻</div>}
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
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
          <div className="anim-up1" style={{...DIS,fontSize:50,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
          <div className="anim-up2" style={{flex:1,display:"flex",gap:12,alignItems:"center"}}>
            {[{n:sn1,v:slide.n1,pk:slide.peak1,win:w===1},{n:sn2,v:slide.n2,pk:slide.peak2,win:w===2}].map(({n,v,pk,win})=>(
              <div key={n} style={{flex:1,textAlign:"center",background:`${textC}10`,borderRadius:18,padding:"16px 8px",border:`2px solid ${win?accent:`${textC}18`}`}}>
                <div style={{...BOD,fontSize:11,color:subC,letterSpacing:3,textTransform:"uppercase",marginBottom:6}}>{n}</div>
                <div style={{fontSize:30,marginBottom:4}}>{v>0?"🌙":"😴"}</div>
                <div style={{...DIS,fontSize:52,color:win?accent:`${textC}55`,lineHeight:1}}>{v}</div>
                <div style={{...BOD,fontSize:11,color:subC,marginTop:4}}>msgs 0h-5h</div>
                <div style={{...BOD,fontSize:12,fontWeight:700,color:accent,marginTop:8}}>{pk}</div>
                <div style={{...BOD,fontSize:10,color:subC}}>pico do dia</div>
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
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:52,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:6}}>
          {slide.scores.map(({name,val,max},i)=>(
            <div key={name} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
                <span style={{...BOD,fontSize:15,fontWeight:700,color:textC}}>{name}</span>
                <span style={{...DIS,fontSize:44,color:accent,lineHeight:1}}>{val}</span>
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
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
          <div className="anim-up1" style={{...DIS,fontSize:52,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
          <div className="anim-up2" style={{flex:1,display:"flex",gap:12,alignItems:"center"}}>
            {[{n:sn1,v:slide.n1,win:w===1},{n:sn2,v:slide.n2,win:w===2}].map(({n,v,win})=>(
              <div key={n} style={{flex:1,textAlign:"center",border:`2px solid ${textC}22`,borderRadius:18,padding:"20px 8px",background:win?`${textC}10`:"transparent"}}>
                <div style={{...BOD,fontSize:11,color:subC,letterSpacing:3,textTransform:"uppercase",marginBottom:8}}>{n}</div>
                <div style={{...DIS,fontSize:80,color:v>0?accent:`${textC}33`,lineHeight:1,animation:v>0?"shake 0.5s 0.5s":"none"}}>{v}</div>
                <div style={{...BOD,fontSize:13,color:subC,marginTop:6}}>{v===0?"impecável 💅":"hmmmm 👀"}</div>
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
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:46,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"flex-end",gap:28,...BOD,fontSize:11,color:subC,textTransform:"uppercase",letterSpacing:2,marginBottom:8,paddingRight:4}}>
            <span>{sn1}</span><span>{sn2}</span>
          </div>
          {slide.rows.map(({label,v1,v2})=>(
            <div key={label} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <span style={{...BOD,fontSize:14,color:textC,fontWeight:600}}>{label}</span>
                <div style={{display:"flex",gap:20}}>
                  <span style={{...DIS,fontSize:30,color:v1>v2?accent:`${textC}55`}}>{v1}</span>
                  <span style={{...DIS,fontSize:30,color:v2>v1?M:`${textC}55`}}>{v2}</span>
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
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:48,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",gap:14}}>
          {[{name:sn1,words:slide.w1},{name:sn2,words:slide.w2}].map(({name,words})=>(
            <div key={name} style={{flex:1}}>
              <div style={{...BOD,fontSize:11,color:subC,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>{name}</div>
              {words.length?words.map(({w,c},i)=>(
                <div key={w} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <span style={{...BOD,fontSize:13+((4-i)*1.5),fontWeight:700,color:textC}}>{w}</span>
                    <span style={{...BOD,fontSize:11,color:subC}}>×{c}</span>
                  </div>
                  <div style={{height:4,borderRadius:99,background:`${textC}15`,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.max(10,(c/words[0].c)*100)}%`,background:i===0?accent:i===1?M:PURPLE,borderRadius:99,transition:"width 1s"}}/>
                  </div>
                </div>
              )):<div style={{...BOD,fontSize:13,color:subC}}>sem dados 💀</div>}
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
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:52,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:12}}>
          {slide.items.map(({name,label,emoji},i)=>(
            <div key={name} style={{display:"flex",alignItems:"center",gap:16,background:`${textC}10`,borderRadius:16,padding:"16px 18px",borderLeft:`4px solid ${i===0?M:L}`}}>
              <span style={{fontSize:48,animation:"float 3s ease-in-out infinite"}}>{emoji}</span>
              <div>
                <div style={{...BOD,fontSize:11,color:subC,textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>{name}</div>
                <div style={{...DIS,fontSize:32,color:accent}}>{label}</div>
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
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:52,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:16}}>
          <div style={{...BOD,fontSize:12,color:subC,textAlign:"center"}}>% de msgs focadas em si mesmo vs no outro</div>
          {[{n:sn1,v:slide.s1mc},{n:sn2,v:slide.s2mc}].map(({n,v})=>(
            <div key={n}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{...BOD,fontSize:14,fontWeight:700,color:textC}}>{n}</span>
                <span style={{...DIS,fontSize:36,color:v>55?accent:`${textC}77`,lineHeight:1}}>{v}%</span>
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
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:52,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",gap:8}}>
          <div style={{fontSize:56,animation:"float 3s ease-in-out infinite"}}>🔥</div>
          <div style={{...DIS,fontSize:90,color:textC,lineHeight:1}}>{slide.count}</div>
          <div style={{...BOD,fontSize:14,color:subC}}>mensagens em</div>
          <div style={{...DIS,fontSize:32,color:accent,textTransform:"capitalize",textAlign:"center"}}>{slide.day}</div>
        </div>
        <Roast text={slide.roast} textC={textC} accent={accent}/>
      </div>
      <div style={{height:SPACER}}/>
    </div>
  );

  if(type==="EMOJIS") return(
    <div style={{width:"100%",height:"100%",background:bg,display:"flex",flexDirection:"column"}}>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:52,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",gap:16}}>
          {slide.items.map(({name,emojis})=>(
            <div key={name} style={{flex:1}}>
              <div style={{...BOD,fontSize:11,color:subC,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>{name}</div>
              {emojis.length?emojis.map(({e,c},i)=>(
                <div key={e} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:30-i*2}}>{e}</span>
                  <span style={{...BOD,fontSize:13,color:subC,fontWeight:700}}>×{c}</span>
                </div>
              )):<div style={{...BOD,fontSize:13,color:subC}}>nenhum emoji 💀</div>}
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
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:52,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:16}}>
          {[{n:sn1,spark:slide.spark1,pk:slide.peak1,col:L},{n:sn2,spark:slide.spark2,pk:slide.peak2,col:TEAL}].map(({n,spark,pk,col})=>(
            <div key={n} style={{background:`${textC}10`,borderRadius:16,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{...BOD,fontSize:13,fontWeight:700,color:textC}}>{n}</span>
                <span style={{...DIS,fontSize:20,color:col}}>pico: {pk}</span>
              </div>
              <SparkLine data={spark} color={col} height={38}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
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
      <div style={{position:"absolute",top:-60,right:-60,width:220,height:220,borderRadius:"50%",background:`${accent}10`,pointerEvents:"none"}}/>
      {PB}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 0",gap:10}}>
        <div className="anim-up1" style={{...DIS,fontSize:52,color:textC,lineHeight:0.88,whiteSpace:"pre-line"}}>{slide.headline}</div>
        <div className="anim-up2" style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:8}}>
          {slide.items.map((item,i)=>(
            <div key={i} style={{...BOD,fontSize:15,fontWeight:700,color:textC,background:`${textC}10`,borderRadius:14,padding:"12px 16px",borderLeft:`3px solid ${accent}`,lineHeight:1.5}}>{item}</div>
          ))}
        </div>
        <div className="anim-up3" style={{...BOD,fontSize:11,color:`${textC}44`,textAlign:"center",letterSpacing:1,marginBottom:4}}>{slide.sub}</div>
      </div>
      <div style={{height:SPACER}}/>
    </div>
  );

  return null;
}

// ── FINALE SCREEN ──────────────────────────────────────
// "finaleRef" captures only the card portion (above the buttons)
// Buttons are outside the capture zone
function FinaleScreen({data, onReplay, onCaptureShare}) {
  const{sn1,sn2,total,days,s1,s2}=data;
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),100);return()=>clearTimeout(t);},[]);

  const rizzWin=s1.rizz>s2.rizz?sn1:s2.rizz>s1.rizz?sn2:"empate";
  const fasterResp=s1.avgResp<s2.avgResp?sn1:s2.avgResp<s1.avgResp?sn2:"empate";
  const moreWords=s1.count>s2.count?sn1:sn2;
  const ghostWin=s1.maxSilence>s2.maxSilence?sn1:s2.maxSilence>s1.maxSilence?sn2:"empate";

  const stats=[
    {emoji:"💬",label:"msgs totais",value:total.toLocaleString("pt-BR"),delay:0.1},
    {emoji:"📅",label:"dias de papo",value:`${days}`,delay:0.2},
    {emoji:"💘",label:"mais rizz",value:rizzWin,delay:0.3},
    {emoji:"⚡",label:"responde + rápido",value:fasterResp,delay:0.4},
    {emoji:"🗣️",label:"fala mais",value:moreWords,delay:0.5},
    {emoji:"👻",label:"some mais",value:ghostWin,delay:0.6},
  ];

  const roastText = s1.rizz>s2.rizz*1.5?`${sn1} tá claramente mais interessado/a 💘`
    :s2.rizz>s1.rizz*1.5?`${sn2} tá claramente mais interessado/a 💘`
    :s1.avgResp<s2.avgResp*0.6?`${sn1} responde mais rápido — tá ligado/a 👀`
    :s2.avgResp<s1.avgResp*0.6?`${sn2} responde mais rápido — tá ligado/a 👀`
    :`conversa equilibrada — os dois estão nessa 🤝`;

  return(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",background:`linear-gradient(160deg, ${M} 0%, ${PURPLE} 55%, ${B} 100%)`,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-80,right:-80,width:300,height:300,borderRadius:"50%",background:`${L}22`}}/>
      <div style={{position:"absolute",bottom:-60,left:-60,width:240,height:240,borderRadius:"50%",background:`${M}28`}}/>

      {/* ── CARD — this part gets captured for sharing ── */}
      <div id="finale-card" style={{flex:1,display:"flex",flexDirection:"column",padding:"28px 20px 16px",gap:14,overflowY:"auto",position:"relative",zIndex:1}}>
        {/* Header */}
        <div style={{textAlign:"center",opacity:show?1:0,transition:"opacity 0.5s"}}>
          <div style={{fontSize:36,marginBottom:6,animation:"float 3s ease-in-out infinite"}}>🎉</div>
          <div style={{...DIS,fontSize:66,color:W,lineHeight:0.85,marginBottom:2}}>ESSE É O</div>
          <div style={{...DIS,fontSize:66,color:L,lineHeight:0.85,marginBottom:14}}>RESULTADO</div>
          <div style={{...BOD,fontSize:17,fontWeight:900,color:W,marginBottom:2}}>{sn1} & {sn2}</div>
          <div style={{...BOD,fontSize:12,color:`${W}66`}}>{total.toLocaleString("pt-BR")} msgs em {days} dias</div>
        </div>

        {/* Stats grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
          {stats.map(({emoji,label,value,delay},i)=>(
            <div key={i} style={{background:"rgba(255,255,255,0.12)",backdropFilter:"blur(10px)",borderRadius:14,padding:"12px 11px",border:"1px solid rgba(255,255,255,0.18)",opacity:show?1:0,transform:show?"translateY(0)":"translateY(20px)",transition:`all 0.4s ${delay}s ease`}}>
              <div style={{fontSize:20,marginBottom:3}}>{emoji}</div>
              <div style={{...BOD,fontSize:9,color:`${W}66`,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{label}</div>
              <div style={{...DIS,fontSize:20,color:W,lineHeight:1}}>{value}</div>
            </div>
          ))}
        </div>

        {/* Roast */}
        <div style={{background:"rgba(255,255,255,0.09)",borderRadius:14,padding:"12px 16px",border:`1px solid ${L}44`,opacity:show?1:0,transition:"opacity 0.5s 0.7s",textAlign:"center"}}>
          <div style={{...BOD,fontSize:14,fontWeight:700,color:W,lineHeight:1.5}}>{roastText}</div>
        </div>

        {/* Watermark — always visible in shared image */}
        <div style={{textAlign:"center",opacity:show?0.55:0,transition:"opacity 0.5s 1s"}}>
          <div style={{...BOD,fontSize:11,color:W,letterSpacing:2,fontWeight:700}}>chat-wrapped.app</div>
        </div>
      </div>

      {/* ── SHARE BUTTONS — NOT captured in screenshot ── */}
      <div style={{padding:"0 20px 32px",display:"flex",flexDirection:"column",gap:10,position:"relative",zIndex:2,opacity:show?1:0,transition:"opacity 0.5s 0.9s"}}>
        <div style={{...BOD,fontSize:11,color:`${W}66`,textAlign:"center",letterSpacing:1,marginBottom:2}}>COMPARTILHAR RESULTADO</div>

        {/* Primary: save image */}
        <button onClick={()=>onCaptureShare("save")}
          style={{...BOD,background:L,border:"none",color:B,borderRadius:14,padding:"14px 20px",cursor:"pointer",fontSize:15,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:`0 4px 24px ${L}55`}}>
          <span style={{fontSize:18}}>📸</span> Salvar imagem
        </button>

        {/* Social row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {/* WhatsApp */}
          <button onClick={()=>onCaptureShare("whatsapp")}
            style={{...BOD,background:"#25D366",border:"none",color:W,borderRadius:12,padding:"12px 8px",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </button>

          {/* Instagram */}
          <button onClick={()=>onCaptureShare("instagram")}
            style={{...BOD,background:"linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",border:"none",color:W,borderRadius:12,padding:"12px 8px",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Instagram
          </button>

          {/* TikTok */}
          <button onClick={()=>onCaptureShare("tiktok")}
            style={{...BOD,background:"#010101",border:`1px solid rgba(255,255,255,0.2)`,color:W,borderRadius:12,padding:"12px 8px",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>
            TikTok
          </button>
        </div>

        {/* Replay */}
        <button onClick={onReplay}
          style={{...BOD,background:"rgba(255,255,255,0.1)",border:`1px solid rgba(255,255,255,0.2)`,color:W,borderRadius:14,padding:"12px 20px",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          ↩ Ver de novo
        </button>
      </div>
    </div>
  );
}

// ── CAPTURE HELPER ─────────────────────────────────────
// Clones the element at fixed 390×844 (iPhone-like) offscreen,
// captures it cleanly, then removes the clone.
async function captureElement(el) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");

  // Force all animated elements to final visible state
  const animated = el.querySelectorAll('.anim-pop,.anim-up1,.anim-up2,.anim-up3,.anim-up4,.finale-num');
  const saved = [];
  animated.forEach(node => {
    saved.push({node, anim:node.style.animation, opacity:node.style.opacity, transform:node.style.transform});
    node.style.cssText += ";animation:none!important;opacity:1!important;transform:none!important;";
  });

  await new Promise(r => setTimeout(r, 80)); // let browser repaint

  const canvas = await window.html2canvas(el, {
    useCORS:true, allowTaint:true, scale:2,
    backgroundColor:null, logging:false,
    width:el.offsetWidth, height:el.offsetHeight,
  });

  // Restore styles
  saved.forEach(({node,anim,opacity,transform}) => {
    node.style.animation=anim;
    node.style.opacity=opacity;
    node.style.transform=transform;
  });

  return canvas;
}

// ── SHARE HELPERS ──────────────────────────────────────
const SITE_URL = "chat-wrapped.app";
const SHARE_TEXT = (sn1, sn2, total, days) =>
  `analisei minha conversa com ${sn1} & ${sn2} 👀\n${total?.toLocaleString("pt-BR")} msgs em ${days} dias\nfaz o seu em: ${SITE_URL}`;

async function getBlob(canvas) {
  return new Promise(res => canvas.toBlob(b => res(b), "image/png"));
}

// Tries native share → falls back to overlay
async function shareNative(canvas, text, setToast, setImgOverlay) {
  const blob = await getBlob(canvas);
  if (!blob) { setToast("erro ao gerar imagem 😢"); return false; }
  const file = new File([blob], "chat-wrapped.png", {type:"image/png"});
  if (navigator.share && navigator.canShare?.({files:[file]})) {
    try {
      await navigator.share({files:[file], text, title:"Chat Wrapped"});
      setToast("compartilhado! 🚀");
      return true;
    } catch(e) { if (e.name === "AbortError") return true; }
  }
  // Show overlay for iOS save
  setImgOverlay(canvas.toDataURL("image/png"));
  return true;
}

async function shareToWhatsApp(canvas, text, setToast, setImgOverlay) {
  // Try native share first (opens WhatsApp directly on mobile)
  const blob = await getBlob(canvas);
  const file = new File([blob], "chat-wrapped.png", {type:"image/png"});
  if (navigator.share && navigator.canShare?.({files:[file]})) {
    try {
      await navigator.share({files:[file], text, title:"Chat Wrapped"});
      setToast("abre o WhatsApp e escolha onde mandar! 📱");
      return;
    } catch(e) { if (e.name === "AbortError") return; }
  }
  // Fallback: save image + open wa.me
  setImgOverlay(canvas.toDataURL("image/png"));
  setTimeout(() => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, 800);
}

async function shareToInstagram(canvas, setToast, setImgOverlay) {
  // Save image + try instagram deep link
  setImgOverlay(canvas.toDataURL("image/png"));
  setToast("salve a imagem → abra o Instagram Stories e cole 📸");
  // Try to open Instagram app (works if installed)
  setTimeout(() => {
    // Try Stories camera deep link
    const igUrl = "instagram://story-camera";
    const fallback = "https://www.instagram.com/";
    const frame = document.createElement("iframe");
    frame.style.display = "none"; frame.src = igUrl;
    document.body.appendChild(frame);
    setTimeout(() => { document.body.removeChild(frame); }, 1000);
  }, 1200);
}

async function shareToTikTok(canvas, setToast, setImgOverlay) {
  setImgOverlay(canvas.toDataURL("image/png"));
  setToast("salve a imagem → abra o TikTok e crie um novo vídeo 🎵");
  setTimeout(() => {
    const frame = document.createElement("iframe");
    frame.style.display = "none"; frame.src = "snssdk1233://";
    document.body.appendChild(frame);
    setTimeout(() => { document.body.removeChild(frame); window.open("https://www.tiktok.com/", "_blank"); }, 1000);
  }, 1200);
}

// ── UPLOAD ─────────────────────────────────────────────
function Upload({onData}) {
  const [mode,setMode]=useState(null);
  const [errMsg,setErrMsg]=useState("");
  const [drag,setDrag]=useState(false);
  const [progress,setProgress]=useState("");

  async function processFile(file) {
    if (!file) return;
    setMode("loading"); setProgress("lendo arquivo...");
    try {
      const isZip = file.name.toLowerCase().endsWith(".zip") || file.type.includes("zip");
      if (isZip) {
        setProgress("carregando JSZip...");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
        setProgress("descompactando...");

        const ab = await file.arrayBuffer();
        const zip = await window.JSZip.loadAsync(ab);
        const allKeys = Object.keys(zip.files);

        // Find chat text file — WhatsApp names it "_chat.txt" sometimes inside a subfolder
        let chatFile = null;
        const allPaths = [];
        for (const key of allKeys) {
          const f = zip.files[key];
          if (f.dir) continue;
          allPaths.push(key);
          const lower = key.toLowerCase();
          if (lower.endsWith("_chat.txt") || lower.endsWith("/chat.txt") || (lower.endsWith(".txt") && !chatFile)) {
            chatFile = f;
          }
        }

        if (!chatFile) {
          // Last resort: find any .txt
          for (const key of allKeys) {
            if (!zip.files[key].dir && key.toLowerCase().endsWith(".txt")) {
              chatFile = zip.files[key]; break;
            }
          }
        }
        if (!chatFile) { setErrMsg(`Não achei .txt no ZIP. Arquivos encontrados: ${allPaths.slice(0,5).join(", ")}`); setMode("error"); return; }

        setProgress("lendo conversa...");
        const chatTxt = await chatFile.async("string");
        const messages = parseTxt(chatTxt);

        setProgress("contando mídias...");
        // allPaths already has full paths — pass them
        const freqScan = {};
        messages.forEach(m => (freqScan[m.sender] = (freqScan[m.sender]||0)+1));
        const [zp1,zp2] = Object.entries(freqScan).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([n])=>n);
        const zipResult = countZipMedia(allPaths, messages, zp1, zp2);
        setProgress(`encontrei ${zipResult.totalMediaFiles} mídias: 🎙️${zipResult.totals.audio} áudios · 🎭${zipResult.totals.sticker} stickers · 📸${zipResult.totals.photo} fotos`);

        await new Promise(r => setTimeout(r, 600)); // show the count briefly
        setProgress("analisando...");
        const result = analyze(messages, zipResult);
        if (!result) {
          const freq = {};
          messages.forEach(m => (freq[m.sender] = (freq[m.sender]||0)+1));
          const found = Object.keys(freq).length;
          setErrMsg(`Precisam ser 2 participantes. Encontrei ${found} pessoas e ${messages.length} msgs. ${found===0?"Formato do arquivo não reconhecido — tente exportar sem mídia (.txt) primeiro.":""}`);
          setMode("error"); return;
        }
        onData(result);
      } else {
        setProgress("lendo conversa...");
        const text = await file.text();
        const messages = parseTxt(text);
        const result = analyze(messages, null);
        if (!result) {
          const freq = {};
          messages.forEach(m => (freq[m.sender] = (freq[m.sender]||0)+1));
          const found = Object.keys(freq).length;
          setErrMsg(`Precisam ser 2 participantes. Encontrei ${found} pessoas e ${messages.length} msgs. ${found===0?"Formato não reconhecido — verifique se é um export do WhatsApp.":""}`);
          setMode("error"); return;
        }
        onData(result);
      }
    } catch(e) { setErrMsg(`Erro: ${e.message}`); setMode("error"); }
  }

  return (
    <div style={{height:"100vh",background:M,display:"flex",flexDirection:"column",overflowY:"auto"}}>
      <div style={{overflow:"hidden",background:B,padding:"9px 0",flexShrink:0}}>
        <div style={{display:"flex",animation:"ticker 14s linear infinite",whiteSpace:"nowrap"}}>
          {Array(6).fill("✦ CHAT WRAPPED ✦ OS DADOS NÃO MENTEM ✦ QUEM É O MAIS APAIXONADO? ✦ QUEM SOME MAIS? ✦ ").map((t,i)=>(
            <span key={i} style={{...DIS,fontSize:17,color:L,paddingRight:32}}>{t}</span>
          ))}
        </div>
      </div>
      <div style={{flex:1,padding:"24px 20px 20px",display:"flex",flexDirection:"column",gap:18}}>
        <div className="anim-pop">
          <div style={{...BOD,fontSize:11,letterSpacing:4,color:`${W}88`,textTransform:"uppercase",marginBottom:6}}>✦ para quem quer saber a verdade ✦</div>
          <div style={{...DIS,fontSize:84,color:W,lineHeight:0.82}}>CHAT</div>
          <div style={{...DIS,fontSize:84,color:L,lineHeight:0.82,marginBottom:10}}>WRAPPED</div>
          <div style={{...BOD,fontSize:15,color:`${W}cc`,fontStyle:"italic",lineHeight:1.4}}>a análise que ninguém pediu<br/>mas todo mundo precisa 💀</div>
        </div>
        <div className="anim-up2" style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {["👻 quem some","💘 rizz score","🤡 delulu index","🌙 madrugada","🗣️ top palavras","✨ main character","🔥 dia maluco","⏰ horário favorito"].map(tag=>(
            <div key={tag} style={{background:`${W}18`,borderRadius:99,padding:"6px 14px",...BOD,fontSize:12,fontWeight:700,color:W,border:`1px solid ${W}28`}}>{tag}</div>
          ))}
        </div>
        <div
          onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);processFile(e.dataTransfer.files[0]);}}
          onClick={()=>mode!=="loading"&&document.getElementById("fup").click()}
          className="anim-up3"
          style={{border:`2.5px dashed ${drag?L:`${W}55`}`,borderRadius:22,padding:"28px 20px",textAlign:"center",cursor:mode==="loading"?"wait":"pointer",background:drag?`${L}15`:`${B}33`,transition:"all 0.2s"}}
        >
          {mode==="loading"?(
            <div>
              <div style={{fontSize:36,animation:"spin 1s linear infinite",display:"inline-block",marginBottom:10}}>⚡</div>
              <div style={{...BOD,fontWeight:900,color:L,fontSize:15,letterSpacing:1,marginBottom:6}}>PROCESSANDO...</div>
              <div style={{...BOD,color:`${W}88`,fontSize:13,lineHeight:1.5}}>{progress}</div>
            </div>
          ):(
            <>
              <div style={{display:"flex",justifyContent:"center",gap:20,marginBottom:14}}><IconZip/><IconTxt/></div>
              <div style={{...BOD,fontWeight:900,fontSize:17,color:W,marginBottom:4}}>solte aqui o .zip ou .txt</div>
              <div style={{...BOD,fontSize:13,color:`${W}77`}}>ou clique para escolher</div>
              {mode==="error"&&<div style={{...BOD,color:L,fontSize:13,marginTop:10,fontWeight:700,background:`${B}44`,borderRadius:10,padding:"8px 12px"}}>{errMsg}</div>}
            </>
          )}
        </div>
        <input id="fup" type="file" accept=".txt,.zip" style={{display:"none"}} onChange={e=>processFile(e.target.files[0])}/>
        <div className="anim-up4" style={{background:`${B}55`,borderRadius:20,padding:"18px",border:`1px solid ${W}18`}}>
          <div style={{...BOD,fontSize:13,fontWeight:900,letterSpacing:3,color:L,textTransform:"uppercase",marginBottom:14}}>📱 como exportar</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            {[{n:"1",t:"Abra a conversa no WhatsApp"},{n:"2",t:"Toque nos 3 pontinhos ⋮"},{n:"3",t:'Mais → "Exportar conversa"'},{n:"4",t:"Escolha o tipo:"}].map(({n,t})=>(
              <div key={n} style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{...DIS,fontSize:26,color:L,width:28,flexShrink:0}}>{n}</div>
                <div style={{...BOD,fontSize:15,color:W,fontWeight:600,lineHeight:1.4}}>{t}</div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1,background:`${W}12`,borderRadius:14,padding:"14px",border:`1px solid ${W}22`}}>
              <div style={{...DIS,fontSize:22,color:L,marginBottom:4}}>SEM MÍDIA</div>
              <div style={{...BOD,fontSize:13,color:W,lineHeight:1.4}}>gera <strong>.txt</strong><br/>análise básica</div>
            </div>
            <div style={{flex:1,background:`${M}22`,borderRadius:14,padding:"14px",border:`2px solid ${M}66`,position:"relative"}}>
              <div style={{position:"absolute",top:-10,right:10,background:M,color:W,fontSize:10,fontWeight:900,padding:"2px 10px",borderRadius:99,letterSpacing:1}}>RECOMENDADO</div>
              <div style={{...DIS,fontSize:22,color:M,marginBottom:4}}>INCLUIR MÍDIA</div>
              <div style={{...BOD,fontSize:13,color:W,lineHeight:1.4}}>gera <strong>.zip</strong><br/>dados completos 📦</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{...BOD,textAlign:"center",fontSize:11,color:`${W}44`,padding:"8px 20px 24px"}}>🔒 zero dados enviados — tudo no seu celular</div>
    </div>
  );
}

// ── APP ROOT ───────────────────────────────────────────
export default function App() {
  const [data,setData]=useState(null);
  const [slides,setSlides]=useState([]);
  const [cur,setCur]=useState(0);
  const [showFinale,setShowFinale]=useState(false);
  const [key,setKey]=useState(0);
  const [toast,setToast]=useState(null);
  const [sharing,setSharing]=useState(false);
  const [imgOverlay,setImgOverlay]=useState(null);
  const slideRef=useRef(null);
  const finaleRef=useRef(null);
  const touchStart=useRef(null);

  function onData(d){setData(d);setSlides(buildSlides(d));setCur(0);setShowFinale(false);setKey(k=>k+1);}

  const isLast = cur===slides.length-1;

  function next(){
    if(isLast){ setShowFinale(true); return; }
    setCur(c=>c+1); setKey(k=>k+1);
  }
  function prev(){if(cur>0){setCur(c=>c-1);setKey(k=>k+1);}}

  function handleTap(e){const x=e.clientX||0,w=e.currentTarget.offsetWidth;if(x>w*0.35)next();else prev();}
  function handleTS(e){touchStart.current=e.touches[0].clientX;}
  function handleTE(e){const dx=e.changedTouches[0].clientX-(touchStart.current||0);if(Math.abs(dx)>50)dx<0?next():prev();touchStart.current=null;}
  function showToast(msg){setToast(msg);setTimeout(()=>setToast(null),3500);}

  async function shareSlide(e){
    e.stopPropagation();
    if(sharing||!slideRef.current) return;
    setSharing(true);
    showToast("gerando imagem... ⚡");
    try{
      const canvas=await captureElement(slideRef.current);
      const text=SHARE_TEXT(data.sn1,data.sn2,data.total,data.days);
      await shareNative(canvas,text,showToast,setImgOverlay);
    }catch(e){showToast(`erro: ${e.message}`);}
    setSharing(false);
  }

  async function handleFinaleShare(platform){
    if(sharing) return;
    setSharing(true);
    showToast("gerando imagem... ⚡");
    try{
      // Capture only the card part (not the buttons)
      const card=document.getElementById("finale-card");
      const target=card||finaleRef.current;
      const canvas=await captureElement(target);
      const text=SHARE_TEXT(data.sn1,data.sn2,data.total,data.days);
      if(platform==="whatsapp") await shareToWhatsApp(canvas,text,showToast,setImgOverlay);
      else if(platform==="instagram") await shareToInstagram(canvas,showToast,setImgOverlay);
      else if(platform==="tiktok") await shareToTikTok(canvas,showToast,setImgOverlay);
      else await shareNative(canvas,text,showToast,setImgOverlay);
    }catch(e){showToast(`erro: ${e.message}`);}
    setSharing(false);
  }

  if(!data) return <Upload onData={onData}/>;

  return(
    <div style={{width:"100vw",height:"100vh",overflow:"hidden",position:"relative",background:B}}>
      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:L,color:B,padding:"10px 24px",borderRadius:99,...BOD,fontWeight:900,fontSize:14,zIndex:999,animation:"pop 0.3s ease",whiteSpace:"nowrap",boxShadow:`0 4px 24px ${L}55`,maxWidth:"90vw",textAlign:"center"}}>
          {toast}
        </div>
      )}

      {/* Image overlay for iOS save */}
      {imgOverlay&&(
        <div onClick={()=>setImgOverlay(null)} style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,0.94)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{...BOD,color:W,fontSize:14,fontWeight:700,marginBottom:16,textAlign:"center",lineHeight:1.6}}>
            <span style={{fontSize:22}}>📱</span><br/>
            <strong>iOS:</strong> pressione e segure a imagem<br/>→ "Adicionar à Fototeca"<br/>
            <span style={{opacity:0.6,fontSize:12}}>depois é só mandar no zap</span>
          </div>
          <img src={imgOverlay} alt="Chat Wrapped"
            style={{maxWidth:"100%",maxHeight:"65vh",borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,0.6)"}}
          />
          <button onClick={()=>setImgOverlay(null)}
            style={{...BOD,marginTop:20,background:`${W}18`,border:"none",color:W,borderRadius:99,padding:"10px 28px",cursor:"pointer",fontWeight:700,fontSize:14}}>
            fechar ✕
          </button>
        </div>
      )}

      {/* FINALE */}
      {showFinale?(
        <>
          <div ref={finaleRef} style={{width:"100%",height:"100%"}}>
            <FinaleScreen
              data={data}
              onReplay={()=>{setCur(0);setShowFinale(false);setKey(k=>k+1);}}
              onCaptureShare={handleFinaleShare}
            />
          </div>
          {/* Bottom bar over finale */}
          <div id="slide-nav" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:20,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px 28px",background:"linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 100%)",gap:8}}>
            <button onClick={()=>setData(null)} style={{...BOD,background:"rgba(255,255,255,0.12)",border:"none",color:W,borderRadius:99,padding:"9px 16px",cursor:"pointer",fontSize:12,fontWeight:700}}>← novo</button>
            <div/>
            <div/>
          </div>
        </>
      ):(
        <>
          {/* SLIDES */}
          <div ref={slideRef} key={key} onClick={handleTap} onTouchStart={handleTS} onTouchEnd={handleTE}
            style={{width:"100%",height:"100%",position:"relative",animation:"fadeIn 0.2s ease"}}>
            {slides[cur]&&<Slide slide={slides[cur]} sn1={data.sn1} sn2={data.sn2} idx={cur} total={slides.length}/>}
          </div>

          {/* Nav bar */}
          <div id="slide-nav" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:20,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px 28px",background:"linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 100%)",gap:8}}>
            <button onClick={e=>{e.stopPropagation();setData(null);}} style={{...BOD,background:"rgba(255,255,255,0.12)",border:"none",color:W,borderRadius:99,padding:"9px 16px",cursor:"pointer",fontSize:12,fontWeight:700}}>← novo</button>
            <div style={{display:"flex",gap:8}}>
              <button onClick={e=>{e.stopPropagation();prev();}} disabled={cur===0}
                style={{background:"rgba(255,255,255,0.12)",border:"none",color:cur===0?"rgba(255,255,255,0.2)":W,borderRadius:99,width:42,height:42,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
              <button onClick={e=>{e.stopPropagation();next();}}
                style={{background:isLast?L:"rgba(255,255,255,0.12)",border:"none",color:isLast?B:W,borderRadius:99,width:42,height:42,cursor:"pointer",fontSize:isLast?16:20,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,boxShadow:isLast?`0 2px 16px ${L}77`:"none"}}>
                {isLast?"🎉":"›"}
              </button>
            </div>
            <button onClick={shareSlide}
              style={{...BOD,background:sharing?"rgba(255,255,255,0.08)":M,border:"none",color:W,borderRadius:99,padding:"9px 18px",cursor:sharing?"not-allowed":"pointer",fontSize:13,fontWeight:900,display:"flex",alignItems:"center",gap:6,boxShadow:sharing?"none":`0 2px 16px ${M}77`,transition:"all 0.2s"}}>
              {sharing?"⏳":"📸"} {sharing?"gerando...":"salvar"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
