(function(){
"use strict";
const E=window.Efem,Z=window.LiberacionZodiacal,$=id=>document.getElementById(id),CARTAS="astroplanetario-cartas";
if(!E||!Z){document.body.textContent="No se pudo cargar el motor de liberación zodiacal.";return}
let fuente="guardada",carta=null,resultado=null;
const meses=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function leerCartas(){try{const a=JSON.parse(localStorage.getItem(CARTAS)||"[]");return Array.isArray(a)?a.filter(c=>c&&typeof c.id==="string"&&E.cartaValida(c.datos)):[]}catch(e){return[]}}
function normal(s){return(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}
function ciudadDe(texto){const exactas=E.CIUDADES.filter(c=>normal(c.etiqueta)===normal(texto));if(exactas.length===1)return exactas[0];const nombre=E.CIUDADES.filter(c=>normal(c.n)===normal(texto));return nombre.length===1?nombre[0]:null}
function isoLocal(ms,tz){const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return{fecha:`${p.year}-${p.month}-${p.day}`,hora:`${p.hour}:${p.minute}`}}
function fechaLarga(ms,tz,hora=false){return new Intl.DateTimeFormat("es-MX",{timeZone:tz,day:"numeric",month:"short",year:"numeric",...(hora?{hour:"2-digit",minute:"2-digit"}:{})}).format(new Date(ms))}
function fechaCorta(ms,tz){return new Intl.DateTimeFormat("es-MX",{timeZone:tz,day:"2-digit",month:"short",year:"numeric"}).format(new Date(ms))}
function posZod(lon){const p=E.posZod(lon);return`${p.signo.g} ${p.texto}`}
function escapar(s){return E.escaparHTML(s)}
function porcentaje(p,ms){return Math.max(0,Math.min(100,(ms-p.inicio)/(p.fin-p.inicio)*100))}
function etiquetaNivel(n){return["","Capítulo mayor","Temporada","Ventana breve","Detalle fino"][n]}
function unidadNivel(n){return["","años","meses simbólicos","unidades de 2½ días","unidades de 5 horas"][n]}

function datosManuales(){
  const f=$("nFecha").value,t=$("nHora").value,lugar=$("nLugar").value.trim();
  if(!f)throw new Error("Falta la fecha de nacimiento.");if(!t)throw new Error("Falta la hora exacta de nacimiento.");
  const ciudad=ciudadDe(lugar);if(!ciudad)throw new Error("Elige una ciudad completa de la lista para aplicar sus coordenadas y zona horaria.");
  const[anio,mes,dia]=f.split("-").map(Number),[hora,min]=t.split(":").map(Number),des=$("nOcurrencia").value;
  return{nombre:$("nNombre").value.trim()||"Carta sin nombre",anio,mes,dia,hora,min,horaConocida:true,lat:ciudad.lat,lon:ciudad.lon,tz:ciudad.tz,lugarTexto:ciudad.etiqueta,sistema:"signos",factorOrbe:1,desambiguacion:des,resumenFecha:`${dia} de ${meses[mes-1]} de ${anio} · ${String(hora).padStart(2,"0")}:${String(min).padStart(2,"0")}`};
}
function cartaElegida(){
  if(fuente==="manual")return datosManuales();
  const elegida=leerCartas().find(c=>c.id===$("cartaSelect").value);if(!elegida)throw new Error("Selecciona una carta guardada.");return elegida.datos;
}
function fechaObjetivo(tz){
  const f=$("fechaObjetivo").value,t=$("horaObjetivo").value||"12:00";if(!f)throw new Error("Elige la fecha que quieres explorar.");
  const[y,m,d]=f.split("-").map(Number),[h,mi]=t.split(":").map(Number);return E.localAUTC(y,m,d,h,mi,tz,"earlier");
}
function mostrarError(e){
  $("estado").className="estado error";$("estado").textContent=e.message||String(e);$("salida").hidden=true;
  if(/dos veces/.test(e.message||"")){$("campoOcurrencia").hidden=false;$("nOcurrencia").focus()}
}
function calcular(nuevaCarta=true){
  try{
    if(nuevaCarta)carta=Z.prepararCarta(cartaElegida(),E);
    if(!carta)throw new Error("Selecciona los datos de nacimiento.");
    const ms=fechaObjetivo(carta.datos.tz),lote=document.querySelector('[name="loteInicio"]:checked').value;
    resultado=Z.calcular(carta,lote,ms);$("estado").className="estado";$("estado").textContent="Cronología calculada con el método indicado al final de la página.";render();
  }catch(e){mostrarError(e)}
}
function irA(ms){const p=isoLocal(ms,carta.datos.tz);$("fechaObjetivo").value=p.fecha;$("horaObjetivo").value=p.hora;calcular(false);$("salida").scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}

function insignias(p){const d=Z.describir(p,resultado.fortunaSigno),a=[];if(d.culminante)a.push('<span class="pico">Periodo culminante</span>');else if(d.angular)a.push('<span>Angular a Fortuna</span>');if(p.liberacion)a.push('<span class="vinculo">Liberación del vínculo</span>');return a.join("")}
function renderResumen(){
  const d=carta.datos,lote=resultado.lote,lon=carta.lotes[lote],s=Z.SIGNOS[resultado.signoInicial];
  $("resumen").innerHTML=`<div class="dato"><small>Carta</small><b>${escapar(d.nombre||"Carta sin nombre")}</b><span>${escapar(d.lugarTexto)}</span></div><div class="dato"><small>Secta</small><b>${carta.diurna?"Diurna":"Nocturna"}</b><span>${carta.diurna?"Sol sobre el horizonte":"Sol bajo el horizonte"}</span></div><div class="dato"><small>Lote inicial</small><b>${lote==="espiritu"?"Espíritu":"Fortuna"} en ${s}</b><span>${posZod(lon)}</span></div><div class="dato"><small>Fecha estudiada</small><b>${fechaLarga(resultado.fecha,d.tz)}</b><span>${d.tz}</span></div>`;
}
function renderPila(){
  $("pila").innerHTML=resultado.pila.map(p=>{const d=Z.describir(p,resultado.fortunaSigno),pc=porcentaje(p,resultado.fecha);return`<article class="nivel-card nivel-${p.nivel}"><div class="nivel-cab"><span>L${p.nivel}</span><small>${etiquetaNivel(p.nivel)}</small></div><div class="nivel-signo"><i>${d.glifo}</i><div><h3>${d.signo}</h3><p>${d.regente} · ${unidadNivel(p.nivel)}</p></div></div><div class="nivel-fechas"><span>${fechaCorta(p.inicio,carta.datos.tz)}</span><span>${fechaCorta(p.fin,carta.datos.tz)}</span></div><div class="barra"><i style="width:${pc.toFixed(2)}%"></i></div><div class="badges">${insignias(p)}</div></article>`}).join("");
}
function renderRueda(){
  const activos=new Map();resultado.pila.forEach(p=>{const a=activos.get(p.signo)||[];a.push(p.nivel);activos.set(p.signo,a)});
  let html='<div class="anillos"><i></i><i></i><i></i></div>';
  for(let i=0;i<12;i++){const levels=activos.get(i)||[],cl=levels.length?" activo":"",fortuna=i===resultado.fortunaSigno?" fortuna":"";html+=`<div class="signo-nodo${cl}${fortuna}" style="--a:${i*30}deg"><span>${Z.GLIFOS[i]}</span><small>${Z.SIGNOS[i]}</small>${levels.length?`<b>${levels.map(n=>"L"+n).join(" · ")}</b>`:""}</div>`}
  const p=resultado.pila[0],d=Z.describir(p,resultado.fortunaSigno);html+=`<div class="centro"><small>Capítulo actual</small><strong>${d.glifo}</strong><b>${d.signo}</b><span>${d.regente}</span></div>`;$("ruedaTiempo").innerHTML=html;
}
function renderPrincipales(){
  const nacimiento=carta.nacimiento,limite=Math.max(nacimiento+110*365.2422*Z.DAY,resultado.fecha+Z.DAY),lista=resultado.principales.filter(p=>p.inicio<limite),activo=resultado.pila[0];
  $("capitulos").innerHTML=lista.map(p=>{const d=Z.describir(p,resultado.fortunaSigno),on=p.inicio===activo.inicio;return`<button class="capitulo${on?" activo":""}" type="button" data-ir="${Math.round((p.inicio+p.fin)/2)}"><span>${d.glifo}</span><b>${d.signo}</b><small>${fechaCorta(p.inicio,carta.datos.tz)}<br>${fechaCorta(p.fin,carta.datos.tz)}</small>${d.culminante?'<em>Culminante</em>':d.angular?'<em>Angular</em>':''}</button>`}).join("");
}
function renderSubperiodos(){
  const activo=resultado.pila[1];$("subperiodos").innerHTML=resultado.niveles[2].map(p=>{const d=Z.describir(p,resultado.fortunaSigno),on=p.inicio===activo.inicio;return`<button class="subperiodo${on?" activo":""}${p.liberacion?" salto":""}" style="--grow:${Math.max(1,p.fin-p.inicio)}" type="button" data-ir="${Math.round((p.inicio+p.fin)/2)}"><span>${d.glifo}</span><b>${d.signo}</b><small>${fechaCorta(p.inicio,carta.datos.tz)}</small>${p.liberacion?'<em>LB</em>':''}</button>`}).join("");
}
function renderLectura(){
  const [l1,l2,l3,l4]=resultado.pila,d1=Z.describir(l1,resultado.fortunaSigno),d2=Z.describir(l2,resultado.fortunaSigno),marcas=resultado.pila.filter(p=>p.liberacion).length;
  $("lectura").innerHTML=`<p class="ceja">Lectura del periodo seleccionado</p><h2>${d1.glifo} ${d1.signo} conduce el capítulo; ${d2.glifo} ${d2.signo} describe la temporada</h2><p>El nivel principal pone el acento en <strong>${d1.tema}</strong>, bajo un regente asociado con ${d1.temaRegente}. Dentro de ese marco, L2 incorpora ${d2.tema} y temas de ${d2.temaRegente}.</p><div class="lectura-grid"><div><small>L3 · Ventana activa</small><b>${Z.GLIFOS[l3.signo]} ${Z.SIGNOS[l3.signo]}</b><span>${fechaLarga(l3.inicio,carta.datos.tz,true)} — ${fechaLarga(l3.fin,carta.datos.tz,true)}</span></div><div><small>L4 · Detalle activo</small><b>${Z.GLIFOS[l4.signo]} ${Z.SIGNOS[l4.signo]}</b><span>${fechaLarga(l4.inicio,carta.datos.tz,true)} — ${fechaLarga(l4.fin,carta.datos.tz,true)}</span></div></div>${marcas?'<p class="aviso-vinculo"><b>Liberación del vínculo activa.</b> Uno de los niveles acaba de saltar al signo opuesto después de completar el circuito zodiacal interno.</p>':''}<p class="criterio">Esta lectura describe el lenguaje simbólico de los periodos. La condición natal de los regentes y otras técnicas temporales aportan el contexto completo.</p>`;
}
function renderTransiciones(){
  const items=[];for(const p of resultado.pila){const lista=p.nivel===1?resultado.principales:resultado.niveles[p.nivel],i=lista.findIndex(x=>x.inicio===p.inicio),prev=lista[i-1],next=lista[i+1];if(prev)items.push({tipo:`Inicio de L${p.nivel}`,ms:p.inicio,texto:`${Z.SIGNOS[prev.signo]} → ${Z.SIGNOS[p.signo]}`});if(next)items.push({tipo:`Próximo cambio L${p.nivel}`,ms:p.fin,texto:`${Z.SIGNOS[p.signo]} → ${Z.SIGNOS[next.signo]}`,liberacion:next.liberacion})}
  items.sort((a,b)=>Math.abs(a.ms-resultado.fecha)-Math.abs(b.ms-resultado.fecha));$("transiciones").innerHTML=items.slice(0,6).map(x=>`<button type="button" data-ir="${x.ms+1000}"><small>${x.tipo}</small><b>${x.texto}</b><span>${fechaLarga(x.ms,carta.datos.tz,true)}</span>${x.liberacion?'<em>Liberación del vínculo</em>':''}</button>`).join("");
}
function render(){renderResumen();renderPila();renderRueda();renderPrincipales();renderSubperiodos();renderLectura();renderTransiciones();$("salida").hidden=false}

function cambiarFuente(nueva){fuente=nueva;document.querySelectorAll("[data-fuente]").forEach(b=>b.classList.toggle("activo",b.dataset.fuente===nueva));$("panelGuardada").hidden=nueva!=="guardada";$("panelManual").hidden=nueva!=="manual"}
function iniciarTema(){const k="astro-studio-theme",r=document.documentElement,b=$("themeToggle");let t="light";try{const s=localStorage.getItem(k);if(s==="light"||s==="dark")t=s}catch(e){}function set(v){r.dataset.studioTheme=v;b.textContent=v==="dark"?"☀ Modo claro":"☾ Modo oscuro"}set(t);b.addEventListener("click",()=>{t=r.dataset.studioTheme==="dark"?"light":"dark";set(t);try{localStorage.setItem(k,t)}catch(e){}})}
function iniciar(){
  iniciarTema();$("ciudades").innerHTML=E.CIUDADES.map(c=>`<option value="${escapar(c.etiqueta)}"></option>`).join("");
  const hoy=new Date(),iso=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;$("fechaObjetivo").value=iso;$("horaObjetivo").value="12:00";
  const cartas=leerCartas();$("cartaSelect").innerHTML=cartas.length?cartas.map(c=>`<option value="${c.id}">${escapar(c.datos.nombre||"Carta sin nombre")} · ${escapar(c.datos.resumenFecha||"")}</option>`).join(""):"<option>Sin cartas guardadas</option>";
  if(!cartas.length){document.querySelector('[data-fuente="guardada"]').disabled=true;cambiarFuente("manual")}else calcular(true);
  document.querySelectorAll("[data-fuente]").forEach(b=>b.addEventListener("click",()=>cambiarFuente(b.dataset.fuente)));
  $("calcular").addEventListener("click",()=>calcular(true));$("cartaSelect").addEventListener("change",()=>calcular(true));document.querySelectorAll('[name="loteInicio"]').forEach(r=>r.addEventListener("change",()=>carta&&calcular(false)));
  $("nEjemplo").addEventListener("click",()=>{$("nNombre").value="Ejemplo de exploración";$("nFecha").value="1990-03-21";$("nHora").value="06:30";$("nLugar").value="Ciudad de México, México"});
  $("salida").addEventListener("click",e=>{const b=e.target.closest("[data-ir]");if(b)irA(Number(b.dataset.ir))});
}
iniciar();
})();
