from pathlib import Path

css = Path('app/orbit-time.css')
if not css.exists():
    raise SystemExit('Falta app/orbit-time.css')

# 1) Cargar estilos de los controles temporales.
p0 = Path('app/part-00.txt')
t0 = p0.read_text(encoding='utf-8')
marker = '<script src="app/orbit-theme.js" defer></script>'
addition = marker + '\n<link rel="stylesheet" href="app/orbit-time.css">'
if 'app/orbit-time.css' not in t0:
    if marker not in t0:
        raise SystemExit('No se encontró orbit-theme.js en part-00')
    t0 = t0.replace(marker, addition, 1)
p0.write_text(t0, encoding='utf-8')

# 2) Sustituir el control simple por navegación temporal completa.
p1 = Path('app/part-01.txt')
t1 = p1.read_text(encoding='utf-8')
old = '''    <div class="grupo">
      <select class="velocidad" id="velocidad" aria-label="Velocidad del tiempo">
        <option value="1">Tiempo real</option>
        <option value="3600">1 hora / seg</option>
        <option value="86400">1 día / seg</option>
        <option value="604800">1 semana / seg</option>
        <option value="2592000">1 mes / seg</option>
        <option value="31536000">1 año / seg</option>
      </select>
      <button class="hoy" id="btnHoy">Ahora</button>
    </div>'''
new = '''    <div class="grupo tiempo-grupo" id="tiempoGrupo">
      <select class="velocidad" id="velocidad" aria-label="Dirección y velocidad del tiempo">
        <option value="1">Tiempo real</option>
        <option value="0">Pausa · fecha fija</option>
        <optgroup label="Avanzar">
          <option value="3600">+ 1 hora / seg</option>
          <option value="86400">+ 1 día / seg</option>
          <option value="604800">+ 1 semana / seg</option>
          <option value="2592000">+ 1 mes / seg</option>
          <option value="31536000">+ 1 año / seg</option>
        </optgroup>
        <optgroup label="Retroceder">
          <option value="-1">− Tiempo real</option>
          <option value="-3600">− 1 hora / seg</option>
          <option value="-86400">− 1 día / seg</option>
          <option value="-604800">− 1 semana / seg</option>
          <option value="-2592000">− 1 mes / seg</option>
          <option value="-31536000">− 1 año / seg</option>
        </optgroup>
      </select>
      <button class="fecha-control" id="btnFechaExacta" type="button" aria-expanded="false" aria-controls="fechaPop">Ir a fecha</button>
      <button class="hoy" id="btnHoy">Ahora</button>
      <button class="carta-momento" id="btnCartaMomento" type="button">Sacar carta astral</button>

      <div class="fecha-pop" id="fechaPop" hidden>
        <p class="fecha-pop-titulo">Ir a una fecha exacta</p>
        <div class="fecha-grid">
          <label>Fecha<input id="fechaOrbital" type="date"></label>
          <label>Hora local<input id="horaOrbital" type="time" step="60"></label>
        </div>
        <div class="fecha-rapida">
          <button type="button" id="btnMenosAnio">− 1 año</button>
          <button type="button" id="btnMasAnio">+ 1 año</button>
        </div>
        <div class="fecha-acciones">
          <button type="button" id="btnCancelarFecha">Cancelar</button>
          <button type="button" class="aplicar-fecha" id="btnAplicarFecha">Ir a fecha</button>
        </div>
        <small class="fecha-nota">La simulación queda pausada en la fecha elegida. Después puedes hacerla avanzar o retroceder desde el selector.</small>
      </div>
    </div>'''
if 'id="btnFechaExacta"' not in t1:
    if old not in t1:
        raise SystemExit('No se encontró el control temporal original en part-01')
    t1 = t1.replace(old, new, 1)
p1.write_text(t1, encoding='utf-8')

# 3) Lógica de simulación: velocidades negativas, fecha exacta y carta astral del momento.
p2 = Path('app/part-02.txt')
t2 = p2.read_text(encoding='utf-8')
old_time = '''let factor = 1, anclaReal = Date.now(), anclaSim = Date.now();
function ahoraSim(){ return anclaSim + (Date.now()-anclaReal)*factor; }
const velSel = document.getElementById("velocidad");
velSel.addEventListener("change", () => {
  anclaSim = ahoraSim(); anclaReal = Date.now(); factor = Number(velSel.value);
});
document.getElementById("btnHoy").addEventListener("click", () => {
  anclaSim = Date.now(); anclaReal = Date.now(); velSel.value = "1"; factor = 1;
});
const fmtFecha = new Intl.DateTimeFormat("es-MX",{dateStyle:"long",timeStyle:"short"});'''
new_time = '''let factor = 1, anclaReal = Date.now(), anclaSim = Date.now();
function ahoraSim(){ return anclaSim + (Date.now()-anclaReal)*factor; }
const velSel = document.getElementById("velocidad");
function fijaTiempo(ms, nuevoFactor=0){
  anclaSim = ms; anclaReal = Date.now(); factor = nuevoFactor;
  const valor = String(nuevoFactor);
  if([...velSel.options].some(o => o.value === valor)) velSel.value = valor;
}
function partesLocales(ms){
  const d = new Date(ms), dos = n => String(n).padStart(2,"0");
  return {
    fecha:`${d.getFullYear()}-${dos(d.getMonth()+1)}-${dos(d.getDate())}`,
    hora:`${dos(d.getHours())}:${dos(d.getMinutes())}`
  };
}
function msFechaOrbital(){
  const f = document.getElementById("fechaOrbital").value;
  const h = document.getElementById("horaOrbital").value || "12:00";
  if(!f) return NaN;
  const [Y,M,D] = f.split("-").map(Number), [hh,mm] = h.split(":").map(Number);
  return new Date(Y,M-1,D,hh||0,mm||0,0,0).getTime();
}
velSel.addEventListener("change", () => {
  anclaSim = ahoraSim(); anclaReal = Date.now(); factor = Number(velSel.value);
});
document.getElementById("btnHoy").addEventListener("click", () => {
  fijaTiempo(Date.now(), 1);
});

const btnFechaExacta = document.getElementById("btnFechaExacta");
const fechaPop = document.getElementById("fechaPop");
function abreFecha(){
  const p = partesLocales(ahoraSim());
  document.getElementById("fechaOrbital").value = p.fecha;
  document.getElementById("horaOrbital").value = p.hora;
  fechaPop.hidden = false; btnFechaExacta.setAttribute("aria-expanded","true");
}
function cierraFecha(){ fechaPop.hidden = true; btnFechaExacta.setAttribute("aria-expanded","false"); }
btnFechaExacta.addEventListener("click", () => fechaPop.hidden ? abreFecha() : cierraFecha());
document.getElementById("btnCancelarFecha").addEventListener("click", cierraFecha);
document.getElementById("btnAplicarFecha").addEventListener("click", () => {
  const ms = msFechaOrbital();
  if(Number.isFinite(ms)){ fijaTiempo(ms, 0); cierraFecha(); }
});
function mueveAnio(delta){
  const ms = msFechaOrbital();
  const d = Number.isFinite(ms) ? new Date(ms) : new Date(ahoraSim());
  const dia = d.getDate();
  d.setDate(1); d.setFullYear(d.getFullYear()+delta);
  const ultimo = new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  d.setDate(Math.min(dia,ultimo));
  const p = partesLocales(d.getTime());
  document.getElementById("fechaOrbital").value = p.fecha;
  document.getElementById("horaOrbital").value = p.hora;
}
document.getElementById("btnMenosAnio").addEventListener("click", () => mueveAnio(-1));
document.getElementById("btnMasAnio").addEventListener("click", () => mueveAnio(1));
document.addEventListener("keydown", e => { if(e.key === "Escape" && !fechaPop.hidden) cierraFecha(); });

document.getElementById("btnCartaMomento").addEventListener("click", () => {
  const p = partesLocales(ahoraSim());
  const f = document.getElementById("nFecha"), h = document.getElementById("nHora");
  if(f) f.value = p.fecha;
  if(h) h.value = p.hora;
  cambiaVista("natal");
  const veloNatal = document.getElementById("velo");
  if(veloNatal) veloNatal.classList.add("visible");
  const cancelar = document.getElementById("nCancelar");
  if(cancelar) cancelar.hidden = false;
  setTimeout(() => document.getElementById("nLugar")?.focus(), 60);
});

const fmtFecha = new Intl.DateTimeFormat("es-MX",{dateStyle:"long",timeStyle:"short"});'''
if 'function msFechaOrbital' not in t2:
    if old_time not in t2:
        raise SystemExit('No se encontró el bloque de tiempo original en part-02')
    t2 = t2.replace(old_time, new_time, 1)
p2.write_text(t2, encoding='utf-8')

# 4) El indicador de Órbitas no debe prometer tiempo real al viajar en el tiempo.
oj = Path('app/orbit-theme.js')
tj = oj.read_text(encoding='utf-8')
tj = tj.replace('Posiciones en tiempo real', 'Tiempo configurable')
oj.write_text(tj, encoding='utf-8')
