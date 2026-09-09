(()=>{'use strict';
const SIGN_INDEX={
  'Aries':0,'Tauro':1,'Géminis':2,'Cáncer':3,
  'Leo':4,'Virgo':5,'Libra':6,'Escorpio':7,
  'Sagitario':8,'Capricornio':9,'Acuario':10,'Piscis':11
};
const NORMALIZE=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const NAME_MAP={'aries':'Aries','tauro':'Tauro','geminis':'Géminis','cancer':'Cáncer','leo':'Leo','virgo':'Virgo','libra':'Libra','escorpio':'Escorpio','sagitario':'Sagitario','capricornio':'Capricornio','acuario':'Acuario','piscis':'Piscis'};
const glyphs={'Aries':'♈︎','Tauro':'♉︎','Géminis':'♊︎','Cáncer':'♋︎','Leo':'♌︎','Virgo':'♍︎','Libra':'♎︎','Escorpio':'♏︎','Sagitario':'♐︎','Capricornio':'♑︎','Acuario':'♒︎','Piscis':'♓︎'};
const SPRITE_URL='/assets/zodiac/zodiac-sprite.webp?v=6';
function injectStyles(){
  const old=document.getElementById('lunar-zodiac-v2-style');if(old)old.remove();
  const s=document.createElement('style');s.id='lunar-zodiac-v2-style';s.textContent=`
    section.hero{position:relative}
    .zodiac-current{right:.15rem!important;top:.3rem!important;min-width:322px!important;padding:.72rem .82rem!important;display:grid!important;grid-template-columns:104px 1fr!important;gap:.78rem!important;align-items:center!important;overflow:hidden}
    .zodiac-current::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 23% 50%,rgba(223,189,117,.10),transparent 45%);pointer-events:none}
    .zv2-art{position:relative;width:100px;height:100px;display:grid;place-items:center;border-radius:16px;border:1px solid rgba(218,187,111,.28);background:#060b18;box-shadow:inset 0 0 28px rgba(218,187,111,.05),0 0 18px rgba(218,187,111,.06);overflow:hidden}
    .zv2-art-img{position:absolute;width:400%;height:300%;max-width:none;object-fit:fill;pointer-events:none;user-select:none;transform-origin:0 0}
    .zv2-art::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 18px rgba(3,6,14,.28);pointer-events:none}
    .zv2-seal{position:relative;display:grid;grid-template-columns:68px 1fr;gap:.72rem;align-items:center;min-width:0}
    .zv2-ring{position:relative;width:66px;height:66px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,rgba(218,187,111,.08) 0 45%,transparent 46%),repeating-conic-gradient(from 0deg,rgba(218,187,111,.48) 0 1deg,transparent 1deg 15deg);box-shadow:0 0 0 1px rgba(218,187,111,.28),0 0 0 5px rgba(218,187,111,.035),inset 0 0 20px rgba(218,187,111,.06)}
    .zv2-ring::after{content:"";position:absolute;inset:8px;border:1px solid rgba(218,187,111,.25);border-radius:50%}
    .zv2-ring .zg{position:relative;z-index:2;min-width:0!important;font-size:1.68rem!important;line-height:1!important}
    .zv2-copy{display:grid;gap:.08rem;min-width:0}
    .zv2-copy .zk{color:#817b8b;font:500 .48rem 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase}
    .zv2-copy .zv{color:#f0e7d8;font:500 .96rem Cinzel,serif;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .zv2-copy .zd{color:#b79e68;font:500 .58rem 'IBM Plex Mono',monospace;letter-spacing:.07em}
    .zv2-caption{grid-column:1/-1;margin-top:.05rem;color:#777181;font:500 .46rem 'IBM Plex Mono',monospace;letter-spacing:.09em;text-transform:uppercase;text-align:center}
    @media(max-width:900px){.zodiac-current{min-width:286px!important;grid-template-columns:90px 1fr!important}.zv2-art{width:86px;height:86px}.zv2-seal{grid-template-columns:58px 1fr}.zv2-ring{width:56px;height:56px}}
    @media(max-width:600px){.zodiac-current{position:static!important;width:min(100%,360px)!important;min-width:0!important;margin:0 auto .6rem!important;grid-template-columns:86px 1fr!important}.zv2-art{width:82px;height:82px}.zv2-caption{text-align:left;padding-left:92px}}
  `;document.head.appendChild(s);
}
function build(){
  const box=document.querySelector('.zodiac-current');
  if(!box)return null;
  injectStyles();
  if(box.dataset.v2==='1'&&document.getElementById('heroZodiacArt'))return box;
  const glyph=box.querySelector('#heroZodiacGlyph'),copy=box.querySelector('.zc');
  if(!glyph||!copy)return box;
  const art=document.createElement('div');art.className='zv2-art';art.id='heroZodiacArt';art.setAttribute('role','img');
  const img=document.createElement('img');img.className='zv2-art-img';img.id='heroZodiacSprite';img.src=SPRITE_URL;img.alt='';img.setAttribute('aria-hidden','true');art.appendChild(img);
  const seal=document.createElement('div');seal.className='zv2-seal';
  const ring=document.createElement('div');ring.className='zv2-ring';
  const newCopy=document.createElement('div');newCopy.className='zv2-copy';
  const caption=document.createElement('div');caption.className='zv2-caption';caption.textContent='Ilustración zodiacal · sello lunar';
  ring.appendChild(glyph);
  [...copy.children].forEach(n=>newCopy.appendChild(n));
  copy.remove();seal.append(ring,newCopy,caption);box.prepend(art);box.append(seal);box.dataset.v2='1';
  return box;
}
function currentName(){const t=document.getElementById('heroZodiacSign')?.textContent?.trim()||'';return NAME_MAP[NORMALIZE(t)]||null}
function render(){
  const box=build();if(!box)return;
  const name=currentName();if(!name)return;
  const idx=SIGN_INDEX[name],col=idx%4,row=Math.floor(idx/4);
  const art=document.getElementById('heroZodiacArt'),img=document.getElementById('heroZodiacSprite');
  if(img){img.style.left=`-${col*100}%`;img.style.top=`-${row*100}%`;}
  if(art){art.dataset.sign=name;art.setAttribute('aria-label',`Ilustración zodiacal premium de ${name}`)}
  box.dataset.sign=name;
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
