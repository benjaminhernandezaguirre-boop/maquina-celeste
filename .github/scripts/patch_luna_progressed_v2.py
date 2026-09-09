from pathlib import Path
import re

p = Path('luna.html')
t = p.read_text(encoding='utf-8')

if 'id="progBirthDate"' in t and 'function useSavedProgressedBirth()' in t:
    print('Luna progresada V2 ya está integrada')
    raise SystemExit(0)

panel = '''<section class="panel" id="panel-progresada">
  <div class="grid">
    <article class="card full">
      <h3>Luna progresada secundaria</h3>
      <p>Usa la equivalencia astrológica de un día de efemérides por un año de vida. Para que el cálculo sea transparente, Astroplanetario necesita la fecha, la hora exacta y la ciudad natal.</p>
      <div class="notice" style="margin:.7rem 0">La hora natal no se sustituye automáticamente por 12:00. Si no la conoces, el resultado no se presenta como exacto. La ciudad se usa para convertir la hora local de nacimiento a UTC con su zona horaria histórica.</div>
      <div class="controls">
        <div class="field"><label for="progBirthDate">Fecha natal</label><input id="progBirthDate" type="date" min="1800-01-01" max="2050-12-31"></div>
        <div class="field"><label for="progBirthTime">Hora natal exacta</label><input id="progBirthTime" type="time" step="60"></div>
        <div class="field fullm"><label for="progBirthCity">Ciudad natal</label><input id="progBirthCity" list="cityList" autocomplete="off" placeholder="Ej. Xalapa, Veracruz, MX"></div>
        <div class="field"><label for="progRef">Fecha a estudiar</label><input id="progRef" type="date" min="1800-01-01" max="2050-12-31"></div>
        <div class="field"><label for="progRefTime">Hora a estudiar</label><input id="progRefTime" type="time" step="60" value="12:00"></div>
        <button class="ghost" id="progUseSaved">Usar última carta</button>
        <button class="primary" id="calcProgressed">Calcular Luna progresada</button>
      </div>
      <div class="result" id="progResult"><p class="small">Introduce los datos natales exactos o carga la última carta guardada. La fecha y hora a estudiar se interpretan en la zona horaria de la ciudad natal para mantener un criterio consistente.</p></div>
    </article>
  </div>
</section>'''

t, n = re.subn(r'<section class="panel" id="panel-progresada">.*?</section>', panel, t, count=1, flags=re.S)
if n != 1:
    raise SystemExit('No se encontró panel-progresada')

new_calc = r'''let activeBirth=null;
function progressedBirthFromInputs(){
  const ds=progBirthDate.value,ts=progBirthTime.value.trim(),written=progBirthCity.value.trim();
  if(!ds||!ts||!written)return null;
  const c=cityFind(written);if(!c)return null;
  const[Y,M,D]=ds.split('-').map(Number),[h,m]=ts.split(':').map(Number);
  return{ms:localToUTC(Y,M,D,h,m,c.tz),city:c,date:ds,time:ts};
}
function useSavedProgressedBirth(){
  const d=savedData();
  if(!d||!d.anio)return false;
  progBirthDate.value=`${d.anio}-${String(d.mes).padStart(2,'0')}-${String(d.dia).padStart(2,'0')}`;
  progBirthCity.value=d.lugarTexto||'';
  if(d.horaConocida===false){
    progBirthTime.value='';
    progResult.innerHTML='<p class="notice">La última carta está guardada sin hora natal conocida. Añade la hora exacta antes de calcular la Luna progresada.</p>';
    return false;
  }
  progBirthTime.value=`${String(d.hora??0).padStart(2,'0')}:${String(d.min??0).padStart(2,'0')}`;
  return true;
}
function calcProgressed(){
  const ds=progBirthDate.value,ts=progBirthTime.value.trim(),written=progBirthCity.value.trim();
  if(!ds){progResult.innerHTML='<p class="notice">Falta la fecha natal.</p>';return}
  if(!ts){progResult.innerHTML='<p class="notice">Falta la hora natal exacta. Astroplanetario no asumirá 12:00 para este cálculo.</p>';return}
  if(!written){progResult.innerHTML='<p class="notice">Falta la ciudad natal para resolver correctamente la zona horaria.</p>';return}
  const c=cityFind(written);
  if(!c){progResult.innerHTML='<p class="notice">No reconozco esa ciudad en la base actual. Elige una sugerencia de la lista para poder aplicar su zona horaria.</p>';return}
  const b=progressedBirthFromInputs();if(!b)return;
  if(!progRef.value){progResult.innerHTML='<p class="notice">Falta la fecha que quieres estudiar.</p>';return}
  const rt=progRefTime.value||'12:00',[Y,M,D]=progRef.value.split('-').map(Number),[hh,mm]=rt.split(':').map(Number);
  const ref=localToUTC(Y,M,D,hh||0,mm||0,b.city.tz);
  const years=(ref-b.ms)/(365.2422*DAY);
  if(years<0){progResult.innerHTML='<p class="notice">La fecha a estudiar es anterior al nacimiento. Elige una fecha posterior para una progresión secundaria.</p>';return}
  const ephem=b.ms+years*DAY,lon=lunaLon(ephem),z=zpos(lon),natal=zpos(lunaLon(b.ms));
  const progressedDate=fmtLocal(ephem,b.city.tz),birthMoment=fmtLocal(b.ms,b.city.tz),studyMoment=fmtLocal(ref,b.city.tz);
  progResult.innerHTML=`
    <p><span class="tag">Edad simbólica ${years.toFixed(4)} años</span></p>
    <h3 style="margin-top:.55rem">${z.glyph} ${z.text} ${z.n}</h3>
    <p><b>Datos usados.</b> Nacimiento: ${birthMoment} · ${b.city.etiqueta} · ${b.city.tz}. Fecha estudiada: ${studyMoment}.</p>
    <p>La efeméride simbólica corresponde a ${years.toFixed(4)} días después del nacimiento: ${progressedDate}. La Luna natal estaba en ${natal.glyph} ${natal.text} ${natal.n}.</p>
    <p class="small">Método: progresiones secundarias, 1 día de efemérides = 1 año tropical de vida (365,2422 días). La posición lunar procede del motor astronómico aproximado de Astroplanetario; para validación profesional se contrastará con efemérides de mayor precisión.</p>`;
}
function updateAll'''

t, n = re.subn(r'let activeBirth=null;function calcProgressed\(\)\{.*?\}\nfunction updateAll', new_calc, t, count=1, flags=re.S)
if n != 1:
    raise SystemExit('No se encontró calcProgressed actual')

marker = "document.querySelectorAll('.tab').forEach"
refs = "const progBirthDate=document.getElementById('progBirthDate'),progBirthTime=document.getElementById('progBirthTime'),progBirthCity=document.getElementById('progBirthCity'),progRefTime=document.getElementById('progRefTime');\n"
if refs not in t:
    if marker not in t:
        raise SystemExit('No se encontró marcador de pestañas')
    t = t.replace(marker, refs + marker, 1)

old_listener = "document.getElementById('progUseSaved').addEventListener('click',()=>{if(useSavedBirth()){progResult.innerHTML='<p class=\"small\">Datos natales cargados. Elige la fecha a estudiar y calcula.</p>'}else progResult.innerHTML='<p class=\"notice\">No encontré una carta guardada.</p>'});"
new_listener = "document.getElementById('progUseSaved').addEventListener('click',()=>{if(useSavedProgressedBirth()){progResult.innerHTML='<p class=\"small\">Datos natales exactos cargados desde la última carta. Revisa la fecha y hora a estudiar y calcula.</p>'}else if(!savedData())progResult.innerHTML='<p class=\"notice\">No encontré una carta guardada.</p>'});"
if old_listener not in t:
    raise SystemExit('No se encontró listener progUseSaved')
t = t.replace(old_listener, new_listener, 1)

old_start = "(async()=>{await loadCities();const now=Date.now(),p=isoLocal(now);selDate.value=p.date;selTime.value=p.time;returnRef.value=p.date;progRef.value=p.date;useSavedBirth();updateAll()})();"
new_start = "(async()=>{await loadCities();const now=Date.now(),p=isoLocal(now);selDate.value=p.date;selTime.value=p.time;returnRef.value=p.date;progRef.value=p.date;progRefTime.value=p.time;useSavedBirth();useSavedProgressedBirth();updateAll()})();"
if old_start not in t:
    raise SystemExit('No se encontró arranque lunar')
t = t.replace(old_start, new_start, 1)

p.write_text(t, encoding='utf-8')
