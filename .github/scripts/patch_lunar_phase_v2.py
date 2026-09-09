from pathlib import Path
import re

repo = Path('.')
luna = repo / 'luna.html'
index = repo / 'index.html'

t = luna.read_text(encoding='utf-8')

# 1) Bloque visual del signo zodiacal en la esquina superior derecha del módulo.
if 'id="heroZodiacSign"' not in t:
    old = '<section class="hero">\n  <div class="moon-stage">'
    new = '''<section class="hero">
  <div class="zodiac-current" aria-live="polite" aria-label="Signo zodiacal actual de la Luna">
    <div class="zg" id="heroZodiacGlyph">☾</div>
    <div class="zc"><span class="zk">Signo zodiacal</span><strong class="zv" id="heroZodiacSign">—</strong><span class="zd" id="heroZodiacDegree">—</span></div>
  </div>
  <div class="moon-stage">'''
    if old not in t:
        raise SystemExit('No se encontró el inicio de hero lunar')
    t = t.replace(old, new, 1)

if '.zodiac-current{' not in t:
    css = '''
.zodiac-current{position:absolute;right:0;top:.55rem;z-index:6;display:flex;align-items:center;gap:.7rem;min-width:170px;padding:.58rem .75rem;border:1px solid #dabb6f32;border-radius:10px;background:linear-gradient(145deg,#0b1020ed,#050812f0);box-shadow:0 14px 34px #0005,0 0 24px #dabb6f08;backdrop-filter:blur(12px)}
.zodiac-current .zg{min-width:34px;text-align:center;color:var(--gold);font:500 1.55rem Cinzel,serif;text-shadow:0 0 18px #dfbd7566}.zodiac-current .zc{display:grid;gap:.05rem}.zodiac-current .zk{color:#817b8b;font:500 .49rem 'IBM Plex Mono',monospace;letter-spacing:.13em;text-transform:uppercase}.zodiac-current .zv{color:#eee5d7;font:500 .86rem Cinzel,serif;letter-spacing:.08em;text-transform:uppercase}.zodiac-current .zd{color:#b79e68;font:500 .56rem 'IBM Plex Mono',monospace;letter-spacing:.06em}
@media(max-width:600px){.zodiac-current{position:static;width:max-content;max-width:100%;margin:0 auto .45rem;justify-content:center}.zodiac-current .zg{font-size:1.3rem}}
'''
    if '</style>' not in t:
        raise SystemExit('No se encontró cierre de estilos')
    t = t.replace('</style>', css + '</style>', 1)

# 2) Clasificación de fase: Luna nueva solo cerca de la conjunción exacta.
phase_pattern = re.compile(r"const EIGHT=\[.*?\];\nfunction phaseName\(a\)\{.*?\}\n", re.S)
phase_repl = '''const EIGHT=['Luna nueva','Luna creciente','Cuarto creciente','Gibosa creciente','Luna llena','Gibosa menguante','Cuarto menguante','Luna menguante'];
function phaseName(a){
  a=mod360(a);
  if(a<12||a>=348)return 'Luna nueva';
  if(a<78)return 'Luna creciente';
  if(a<102)return 'Cuarto creciente';
  if(a<168)return 'Gibosa creciente';
  if(a<192)return 'Luna llena';
  if(a<258)return 'Gibosa menguante';
  if(a<282)return 'Cuarto menguante';
  return 'Luna menguante';
}
'''
if not phase_pattern.search(t):
    if "function phaseName(a){\n  a=mod360(a);" not in t:
        raise SystemExit('No se encontró clasificación de fases')
else:
    t = phase_pattern.sub(phase_repl, t, count=1)

t = t.replace("'Creciente inicial':", "'Luna creciente':")
t = t.replace("'Menguante balsámica':", "'Luna menguante':")

# 3) Render de la Luna: mantener el hemisferio oscuro, pero hacer visible el creciente/menguante real.
draw_pattern = re.compile(r"function drawMoon\(angle\)\{.*?\}\nlet cities=", re.S)
new_draw = r'''function drawMoon(angle){
  const c=document.getElementById('moonCanvas'),g=c.getContext('2d'),W=c.width,H=c.height,img=g.createImageData(W,H),d=img.data;
  const th=angle*RAD,sx=Math.sin(th),sz=-Math.cos(th),cx=W/2,cy=H/2,R=W*.44;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const nx=(x-cx)/R,ny=(y-cy)/R,q=nx*nx+ny*ny,i=(y*W+x)*4;
    if(q>1){d[i+3]=0;continue}
    const nz=Math.sqrt(1-q),dot=nx*sx+nz*sz,lit=Math.max(0,dot),limb=.7+.3*nz;
    const earthshine=10+7*nz,light=226*Math.pow(lit,.56),noise=.95+.035*Math.sin(x*.17+y*.11)+.018*Math.sin(x*.41-y*.23);
    const v=Math.max(8,Math.min(242,(earthshine+light)*limb*noise));
    d[i]=Math.min(255,v*1.035);d[i+1]=Math.min(255,v*1.005);d[i+2]=Math.min(255,v*.97);d[i+3]=255;
  }
  g.putImageData(img,0,0);
  g.save();g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.strokeStyle='rgba(223,213,194,.34)';g.lineWidth=1.25;g.stroke();
  g.globalCompositeOperation='source-atop';g.fillStyle='rgba(165,150,137,.11)';
  [[.32,.32,.09],[.62,.43,.065],[.44,.66,.075],[.7,.68,.045],[.28,.58,.04]].forEach(([px,py,rr])=>{g.beginPath();g.arc(cx+(px-.5)*R*1.6,cy+(py-.5)*R*1.6,R*rr,0,7);g.fill()});
  g.restore();
}
let cities='''
if not draw_pattern.search(t):
    if 'const earthshine=10+7*nz' not in t:
        raise SystemExit('No se encontró drawMoon')
else:
    t = draw_pattern.sub(new_draw, t, count=1)

# 4) Sincronizar título grande, Luna dibujada y signo zodiacal con el instante seleccionado.
summary_pattern = re.compile(r"function updateSummary\(\)\{.*?\}\nfunction renderLunations", re.S)
new_summary = r'''function updateSummary(){
  const ms=selectedMs(),a=phaseAngle(ms),ill=(1-Math.cos(a*RAD))/2*100,z=zpos(lunaLon(ms)),age=a/360*SYN,dist=lunaDist(ms),name=phaseName(a);
  phaseNameEl.textContent=name;
  phaseLead.textContent=`Separación Sol–Luna: ${a.toFixed(1)}°. La Luna está ${a<180?'creciendo hacia la plenitud':'menguando hacia la próxima conjunción'}.`;
  illum.textContent=`${ill.toFixed(1)} %`;waxing.textContent=a<180?'creciente':'menguante';moonSign.textContent=`${z.glyph} ${z.n}`;moonDegree.textContent=z.text;
  heroZodiacGlyph.textContent=z.glyph;heroZodiacSign.textContent=z.n;heroZodiacDegree.textContent=z.text;
  moonAge.textContent=`${age.toFixed(1)} días`;moonDist.textContent=`${Math.round(dist).toLocaleString('es-MX')} km`;phaseProgress.style.width=`${a/360*100}%`;
  drawMoon(a);cycleTextEl.textContent=cycleText(a);
  const T=siglos(julian(ms)),node=nodoNorte(T),sep=Math.min(adiff(lunaLon(ms),node),adiff(lunaLon(ms),mod360(node+180)));
  nodeState.textContent=sep<10?'Muy cerca del eje nodal':sep<18?'Dentro de temporada nodal':'Fuera de la zona nodal';
  nodeText.textContent=`La Luna está a ${sep.toFixed(1)}° del nodo más cercano. ${sep<18?'Una lunación cercana a este eje puede coincidir con temporada de eclipses; la clasificación exacta requiere latitud lunar y geometría adicional.':'No hay una proximidad nodal fuerte en este instante.'}`;
  const evs=phaseEvents(ms,18,22),prev=[...evs].filter(e=>e.ms<ms).pop(),next=evs.find(e=>e.ms>=ms);
  if(prev){prevPhaseName.textContent=prev.n;prevPhaseDate.textContent=fmtLocal(prev.ms)}
  if(next){nextPhaseName.textContent=next.n;nextPhaseDate.textContent=fmtLocal(next.ms)}
}
function renderLunations'''
if not summary_pattern.search(t):
    if 'heroZodiacGlyph.textContent=z.glyph' not in t:
        raise SystemExit('No se encontró updateSummary')
else:
    t = summary_pattern.sub(new_summary, t, count=1)

refs = "const heroZodiacGlyph=document.getElementById('heroZodiacGlyph'),heroZodiacSign=document.getElementById('heroZodiacSign'),heroZodiacDegree=document.getElementById('heroZodiacDegree');\n"
if refs not in t:
    marker = "const progBirthDate=document.getElementById('progBirthDate'),progBirthTime=document.getElementById('progBirthTime'),progBirthCity=document.getElementById('progBirthCity'),progRefTime=document.getElementById('progRefTime');\n"
    if marker not in t:
        raise SystemExit('No se encontró marcador de referencias de Luna progresada')
    t = t.replace(marker, marker + refs, 1)

luna.write_text(t, encoding='utf-8')

# 5) Cache-busting para que la portada no siga abriendo una copia antigua de luna.html.
i = index.read_text(encoding='utf-8')
i = re.sub(r"location\.href='\./luna\.html(?:\?v=[^']*)?'", "location.href='./luna.html?v=lunar-phase-v2-20260909'", i)
index.write_text(i, encoding='utf-8')

print('Luna V2 aplicada: fase real, dibujo sincronizado, signo zodiacal dinámico y cache-busting.')
