(()=>{'use strict';
const SIGN_ART={
  'Aries':`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 70V48M47 49C43 25 22 19 17 34c-5 16 8 25 20 16 7-5 9-13 7-22M53 49c4-24 25-30 30-15 5 16-8 25-20 16-7-5-9-13-7-22"/><path d="M43 69c3 5 11 5 14 0"/></svg>`,
  'Tauro':`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M35 37C23 34 17 25 18 18c9 1 17 7 21 15M65 37c12-3 18-12 17-19-9 1-17 7-21 15"/><path d="M35 34c-5 7-7 17-4 28 3 12 12 20 19 20s16-8 19-20c3-11 1-21-4-28"/><path d="M40 53h1M59 53h1M43 68c4 3 10 3 14 0"/></svg>`,
  'Géminis':`<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="35" cy="31" r="9"/><circle cx="65" cy="31" r="9"/><path d="M25 77c1-19 4-31 10-31s9 12 10 31M55 77c1-19 4-31 10-31s9 12 10 31"/><path d="M23 80h24M53 80h24M45 51h10"/></svg>`,
  'Cáncer':`<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="55" rx="24" ry="16"/><path d="M26 51c-9 0-14-8-11-15 8 0 14 3 17 9M74 51c9 0 14-8 11-15-8 0-14 3-17 9"/><path d="M32 65 22 75M39 69 34 82M68 65l10 10M61 69l5 13"/><circle cx="42" cy="51" r="2"/><circle cx="58" cy="51" r="2"/></svg>`,
  'Leo':`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 17c16 0 29 14 29 31 0 19-13 35-29 35S21 67 21 48c0-17 13-31 29-31Z"/><path d="M37 30 29 20M63 30l8-10M35 47c3-4 8-4 11 0M54 47c3-4 8-4 11 0"/><path d="M50 53c-5 0-8 4-8 8 0 8 16 8 16 0 0-4-3-8-8-8Z"/><path d="M50 63v8M43 70c4 4 10 4 14 0"/></svg>`,
  'Virgo':`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M51 83V24"/><path d="M51 34c-8-8-15-8-20-6 3 9 9 14 20 15M51 49c-10-7-18-6-23-3 4 9 11 13 23 12M51 63c-8-5-15-4-20-1 4 8 10 11 20 10"/><path d="M51 39c8-8 15-8 20-6-3 9-9 14-20 15M51 55c9-7 17-6 22-3-4 9-11 13-22 12"/></svg>`,
  'Libra':`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 23v50M26 34h48M34 34 22 58h24L34 34ZM66 34 54 58h24L66 34Z"/><path d="M34 76h32M27 82h46"/></svg>`,
  'Escorpio':`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M33 59c7-10 17-15 27-12 9 3 13 11 11 19-2 9-12 15-20 11-7-3-9-12-4-17 5-5 12-2 12 4"/><path d="M30 57 17 47M31 62 16 67M69 49c8-12 18-18 22-12 4 7-7 13-12 15"/><path d="m88 36 5-8 3 9"/><circle cx="35" cy="55" r="3"/></svg>`,
  'Sagitario':`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M25 77 76 26M60 24h18v18"/><path d="M31 68c-10-13-9-31 3-42 11-10 28-11 40-3"/><path d="M42 60 27 45M50 52l15 15"/></svg>`,
  'Capricornio':`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M26 47c0-15 9-25 22-25 9 0 15 6 14 13-1 8-12 10-17 4-4-5-1-11 5-12"/><path d="M26 47c7 4 13 11 16 20 3 10 11 15 20 13 10-2 14-11 9-18-5-7-15-6-19 1"/><path d="M71 62c7 2 13 8 15 15-7 2-14 0-19-4"/></svg>`,
  'Acuario':`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M40 22h20l6 18-16 8-16-8 6-18Z"/><path d="M47 48c-6 9-9 14-9 20"/><path d="M20 69c8-7 15 7 23 0s15 7 23 0 15 7 23 0M20 79c8-7 15 7 23 0s15 7 23 0 15 7 23 0"/></svg>`,
  'Piscis':`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M18 37c11-13 28-12 37 2-8 12-25 15-37 2l-6-2 6-2ZM82 63c-11 13-28 12-37-2 8-12 25-15 37-2l6 2-6 2Z"/><circle cx="43" cy="38" r="1.7"/><circle cx="57" cy="62" r="1.7"/><path d="M36 50h28"/></svg>`
};
const NORMALIZE=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const NAME_MAP={'aries':'Aries','tauro':'Tauro','geminis':'Géminis','cancer':'Cáncer','leo':'Leo','virgo':'Virgo','libra':'Libra','escorpio':'Escorpio','sagitario':'Sagitario','capricornio':'Capricornio','acuario':'Acuario','piscis':'Piscis'};
const glyphs={'Aries':'♈︎','Tauro':'♉︎','Géminis':'♊︎','Cáncer':'♋︎','Leo':'♌︎','Virgo':'♍︎','Libra':'♎︎','Escorpio':'♏︎','Sagitario':'♐︎','Capricornio':'♑︎','Acuario':'♒︎','Piscis':'♓︎'};
function injectStyles(){
  if(document.getElementById('lunar-zodiac-v2-style'))return;
  const s=document.createElement('style');s.id='lunar-zodiac-v2-style';s.textContent=`
    section.hero{position:relative}
    .zodiac-current{right:.15rem!important;top:.3rem!important;min-width:288px!important;padding:.7rem .8rem!important;display:grid!important;grid-template-columns:92px 1fr!important;gap:.72rem!important;align-items:center!important;overflow:hidden}
    .zodiac-current::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 22% 50%,rgba(223,189,117,.08),transparent 42%);pointer-events:none}
    .zv2-art{position:relative;width:88px;height:88px;display:grid;place-items:center;border-radius:16px;border:1px solid rgba(218,187,111,.23);background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(218,187,111,.025));box-shadow:inset 0 0 24px rgba(218,187,111,.04)}
    .zv2-art svg{width:72px;height:72px;fill:none;stroke:#d8b96f;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 8px rgba(223,189,117,.16))}
    .zv2-seal{position:relative;display:grid;grid-template-columns:66px 1fr;gap:.7rem;align-items:center;min-width:0}
    .zv2-ring{position:relative;width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,rgba(218,187,111,.08) 0 45%,transparent 46%),repeating-conic-gradient(from 0deg,rgba(218,187,111,.48) 0 1deg,transparent 1deg 15deg);box-shadow:0 0 0 1px rgba(218,187,111,.28),0 0 0 5px rgba(218,187,111,.035),inset 0 0 20px rgba(218,187,111,.06)}
    .zv2-ring::after{content:"";position:absolute;inset:8px;border:1px solid rgba(218,187,111,.25);border-radius:50%}
    .zv2-ring .zg{position:relative;z-index:2;min-width:0!important;font-size:1.65rem!important;line-height:1!important}
    .zv2-copy{display:grid;gap:.08rem;min-width:0}
    .zv2-copy .zk{color:#817b8b;font:500 .48rem 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase}
    .zv2-copy .zv{color:#f0e7d8;font:500 .94rem Cinzel,serif;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .zv2-copy .zd{color:#b79e68;font:500 .57rem 'IBM Plex Mono',monospace;letter-spacing:.07em}
    .zv2-caption{grid-column:1/-1;margin-top:.05rem;color:#777181;font:500 .46rem 'IBM Plex Mono',monospace;letter-spacing:.09em;text-transform:uppercase;text-align:center}
    @media(max-width:900px){.zodiac-current{min-width:262px!important;grid-template-columns:80px 1fr!important}.zv2-art{width:76px;height:76px}.zv2-art svg{width:62px;height:62px}.zv2-seal{grid-template-columns:58px 1fr}.zv2-ring{width:56px;height:56px}}
    @media(max-width:600px){.zodiac-current{position:static!important;width:min(100%,340px)!important;min-width:0!important;margin:0 auto .6rem!important;grid-template-columns:76px 1fr!important}.zv2-art{width:72px;height:72px}.zv2-art svg{width:58px;height:58px}.zv2-caption{text-align:left;padding-left:84px}}
  `;document.head.appendChild(s);
}
function build(){
  const box=document.querySelector('.zodiac-current');
  if(!box||box.dataset.v2==='1')return box;
  injectStyles();
  const glyph=box.querySelector('#heroZodiacGlyph'),copy=box.querySelector('.zc');
  if(!glyph||!copy)return box;
  const art=document.createElement('div');art.className='zv2-art';art.id='heroZodiacArt';art.setAttribute('aria-hidden','true');
  const seal=document.createElement('div');seal.className='zv2-seal';
  const ring=document.createElement('div');ring.className='zv2-ring';
  const newCopy=document.createElement('div');newCopy.className='zv2-copy';
  const caption=document.createElement('div');caption.className='zv2-caption';caption.textContent='Ilustración zodiacal · sello lunar';
  ring.appendChild(glyph);
  [...copy.children].forEach(n=>newCopy.appendChild(n));
  copy.remove();
  seal.append(ring,newCopy,caption);
  box.prepend(art);
  box.append(seal);
  box.dataset.v2='1';
  return box;
}
function currentName(){
  const t=document.getElementById('heroZodiacSign')?.textContent?.trim()||'';
  return NAME_MAP[NORMALIZE(t)]||null;
}
function render(){
  const box=build(); if(!box)return;
  const name=currentName(); if(!name)return;
  const art=document.getElementById('heroZodiacArt');
  if(art&&art.dataset.sign!==name){art.innerHTML=SIGN_ART[name];art.dataset.sign=name;art.setAttribute('aria-label',`Mini ilustración zodiacal de ${name}`);art.setAttribute('aria-hidden','false')}
  box.dataset.sign=NAME_MAP[NORMALIZE(name)]||name;
  const glyph=document.getElementById('heroZodiacGlyph');if(glyph&&glyph.textContent.trim()!==glyphs[name])glyph.textContent=glyphs[name];
}
function boot(){
  build();render();
  const sign=document.getElementById('heroZodiacSign'),deg=document.getElementById('heroZodiacDegree');
  if(sign)new MutationObserver(render).observe(sign,{childList:true,characterData:true,subtree:true});
  if(deg)new MutationObserver(render).observe(deg,{childList:true,characterData:true,subtree:true});
  document.getElementById('selDate')?.addEventListener('change',()=>requestAnimationFrame(render));
  document.getElementById('selTime')?.addEventListener('change',()=>requestAnimationFrame(render));
  document.getElementById('btnNow')?.addEventListener('click',()=>setTimeout(render,0));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();