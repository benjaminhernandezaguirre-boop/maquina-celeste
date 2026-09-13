/* Interfaz de la calculadora de dignidades esenciales. */
(function(){
"use strict";
const E=window.Efem,P=window.Profecciones,D=window.Dignidades,$=id=>document.getElementById(id),CARTAS="astroplanetario-cartas";
if(!E||!P||!D){document.body.textContent="No se pudo cargar el motor de dignidades.";return}
let fuente="guardada",carta=null;
const meses=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const esc=s=>E.escaparHTML(String(s==null?"":s));
const ETIQUETA={domicilio:"Domicilio",exaltacion:"Exaltación",triplicidad:"Triplicidad",termino:"Término",faz:"Faz",exilio:"Exilio",caida:"Caída"};

function leerCartas(){try{const a=JSON.parse(localStorage.getItem(CARTAS)||"[]");return Array.isArray(a)?a.filter(c=>c&&typeof c.id==="string"&&E.cartaValida(c.datos)):[]}catch(e){return[]}}
function normal(s){return(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim()}
function ciudadDe(t){const ex=E.CIUDADES.filter(c=>normal(c.etiqueta)===normal(t));if(ex.length===1)return ex[0];const n=E.CIUDADES.filter(c=>normal(c.n)===normal(t));return n.length===1?n[0]:null}
const posZod=lon=>{const p=E.posZod(lon);return`${p.signo.g} ${p.texto}`};
const fechaHora=(ms,tz)=>new Intl.DateTimeFormat("es-MX",{timeZone:tz,day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(ms));
const hora=(ms,tz)=>new Intl.DateTimeFormat("es-MX",{timeZone:tz,hour:"2-digit",minute:"2-digit"}).format(new Date(ms));

function opciones(){return{terminos:$("selTerminos").value,triplicidad:$("selTriplicidad").value,E};}
function datosManuales(){
  const f=$("nFecha").value,t=$("nHora").value,lugar=$("nLugar").value.trim();
  if(!f)throw new Error("Falta la fecha de nacimiento.");
  if(!t)throw new Error("Falta la hora exacta de nacimiento.");
  const ciudad=ciudadDe(lugar);
  if(!ciudad)throw new Error("Elige una ciudad completa de la lista para aplicar sus coordenadas y zona horaria.");
  const[anio,mes,dia]=f.split("-").map(Number),[h,mi]=t.split(":").map(Number);
  return{nombre:$("nNombre").value.trim()||"Carta sin nombre",anio,mes,dia,hora:h,min:mi,horaConocida:true,
    lat:ciudad.lat,lon:ciudad.lon,tz:ciudad.tz,lugarTexto:ciudad.etiqueta,sistema:"signos",factorOrbe:1,
    desambiguacion:$("nOcurrencia").value,
    resumenFecha:`${dia} de ${meses[mes-1]} de ${anio} · ${String(h).padStart(2,"0")}:${String(mi).padStart(2,"0")}`};
}
function cartaElegida(){
  if(fuente==="manual")return datosManuales();
  const el=leerCartas().find(c=>c.id===$("cartaSelect").value);
  if(!el)throw new Error("Selecciona una carta guardada.");
  return el.datos;
}
function mostrarError(e){
  $("estado").className="estado error";$("estado").textContent=e.message||String(e);$("salida").hidden=true;
  if(/dos veces/.test(e.message||"")){$("campoOcurrencia").hidden=false;$("nOcurrencia").focus()}
}
function calcular(nueva){
  try{
    if(nueva!==false)carta=P.prepararCarta(cartaElegida(),E);
    if(!carta)throw new Error("Selecciona los datos de nacimiento.");
    $("estado").className="estado";
    $("estado").textContent="Dignidades calculadas con el criterio indicado al final de la página.";
    render();
  }catch(e){mostrarError(e)}
}

/* ---------- pintado ---------- */
const punto=n=>n>0?`<span class="pos">+${n}</span>`:n<0?`<span class="neg">${n}</span>`:`<span class="cero">0</span>`;
function celdaDig(fila,tipo){
  const tiene=fila.dignidades.some(d=>d.tipo===tipo);
  const mal=fila.debilidades.some(d=>d.tipo===tipo);
  if(tiene)return`<td class="num"><span class="marca-dig fuerte">+${D.PUNTOS[tipo]}</span></td>`;
  if(mal)return`<td class="num"><span class="marca-dig debil">${D.PUNTOS[tipo]}</span></td>`;
  return`<td class="num cero">·</td>`;
}
function renderTabla(){
  const op=opciones(),tabla=D.tablaCarta(carta,op);
  $("tablaDig").innerHTML=tabla.map(f=>{
    const d=f.detalle;
    return`<tr>
      <td class="glifo">${f.simbolo}</td><td><b>${esc(f.planeta)}</b></td>
      <td>${posZod(f.lon)}</td><td class="num">${f.casa}</td>
      ${celdaDig(f,"domicilio")}${celdaDig(f,"exaltacion")}${celdaDig(f,"triplicidad")}${celdaDig(f,"termino")}${celdaDig(f,"faz")}
      ${celdaDig(f,"exilio")}${celdaDig(f,"caida")}
      <td class="num"><b>${punto(f.puntuacion)}</b></td>
      <td>${esc(f.resumen)}</td>
      <td style="color:var(--muted);font-size:.8rem">${esc(d.termino.planeta)} / ${esc(d.faz.planeta)}</td></tr>`;
  }).join("");
  const mejor=[...tabla].sort((a,b)=>b.puntuacion-a.puntuacion)[0];
  const peor =[...tabla].sort((a,b)=>a.puntuacion-b.puntuacion)[0];
  const pereg=tabla.filter(f=>f.peregrino).map(f=>f.planeta);
  $("lecturaTabla").innerHTML=`
   <div class="tarjeta"><small>El más digno</small><b>${mejor.simbolo} ${esc(mejor.planeta)}</b><span>${esc(mejor.resumen)} · ${punto(mejor.puntuacion)} puntos</span></div>
   <div class="tarjeta"><small>El más afligido</small><b>${peor.simbolo} ${esc(peor.planeta)}</b><span>${esc(peor.resumen)} · ${punto(peor.puntuacion)} puntos</span></div>
   <div class="tarjeta"><small>Peregrinos</small><b>${pereg.length?pereg.length:"Ninguno"}</b><span>${pereg.length?esc(pereg.join(", "))+" — sin dignidad ni debilidad en su grado":"Todos los planetas tienen alguna dignidad o debilidad"}</span></div>`;
}
function renderAngulos(){
  const op=opciones(),pts=[{n:"Ascendente",lon:carta.asc},{n:"Medio Cielo",lon:carta.mc}];
  $("tablaAngulos").innerHTML=pts.map(p=>{
    const d=D.dignidadesDe(p.lon,carta.diurna,op),a=D.almutenDeGrado(p.lon,carta.diurna,op);
    return`<tr><td><b>${esc(p.n)}</b></td><td>${posZod(p.lon)}</td>
      <td>${esc(d.domicilio)}</td><td>${d.exaltacion?esc(d.exaltacion.planeta):"<span class='cero'>·</span>"}</td>
      <td>${esc(d.regenteTriplicidad)}</td><td>${esc(d.termino.planeta)} <span class="cero">(${d.termino.desde}–${d.termino.hasta}°)</span></td>
      <td>${esc(d.faz.planeta)}</td>
      <td><b>${a.ganador?esc(a.ganador.planeta):"—"}</b></td></tr>`;
  }).join("");
}
function renderAlmuten(){
  const op=opciones(),a=D.almutenFiguris(carta,op),tz=carta.datos.tz;
  $("almutenTabla").innerHTML=a.tabla.map((t,i)=>
    `<tr${i===0?' class="ahora"':''}><td class="glifo">${D.SIMBOLOS[t.planeta]}</td><td><b>${esc(t.planeta)}</b></td>
     <td class="num">${t.esencial}</td><td class="num">${t.accidental}</td><td class="num"><b>${t.total}</b></td>
     <td style="white-space:normal;color:var(--muted);font-size:.78rem">${t.detalle.filter(x=>x.puntos>0).map(x=>esc(x.punto)+" ("+x.puntos+")").join(" · ")}</td></tr>`).join("");
  const hp=a.horaPlanetaria;
  $("almutenResumen").innerHTML=`
   <div class="tarjeta"><small>Almutén figuris</small><b>${D.SIMBOLOS[a.ganador.planeta]} ${esc(a.ganador.planeta)}</b><span>${a.ganador.total} puntos: ${a.ganador.esencial} esenciales y ${a.ganador.accidental} accidentales</span></div>
   <div class="tarjeta"><small>Secta</small><b>${carta.diurna?"Carta diurna":"Carta nocturna"}</b><span>${carta.diurna?"El Sol estaba sobre el horizonte":"El Sol estaba bajo el horizonte"}</span></div>
   <div class="tarjeta"><small>Lote de Fortuna</small><b>${posZod(a.fortuna)}</b><span>Uno de los cinco puntos que se puntúan</span></div>
   <div class="tarjeta"><small>Sicigia prenatal</small><b>${a.sicigia?esc(a.sicigia.tipo):"No hallada"}</b><span>${a.sicigia?fechaHora(a.sicigia.ms,tz)+" · "+posZod(a.sicigia.lon):"—"}</span></div>
   ${hp?`<div class="tarjeta"><small>Regente del día</small><b>${esc(hp.regenteDia)}</b><span>El día astrológico corrió de la salida del Sol (${hora(hp.salida,tz)}) a la siguiente</span></div>
   <div class="tarjeta"><small>Regente de la hora</small><b>${esc(hp.regenteHora)}</b><span>Hora ${hp.indice} ${hp.esDia?"diurna":"nocturna"}, de ${Math.round(hp.duracionHora/60000)} minutos</span></div>`
   :`<div class="tarjeta"><small>Hora planetaria</small><b>No aplica</b><span>En esta latitud el Sol no sale o no se pone ese día</span></div>`}`;
}
function render(){renderTabla();renderAngulos();renderAlmuten();$("salida").hidden=false}

/* ---------- arranque ---------- */
function cambiarFuente(n){
  fuente=n;
  document.querySelectorAll("[data-fuente]").forEach(b=>b.classList.toggle("activo",b.dataset.fuente===n));
  $("panelGuardada").hidden=n!=="guardada";$("panelManual").hidden=n!=="manual";
}
function iniciar(){
  $("ciudades").innerHTML=E.CIUDADES.map(c=>`<option value="${esc(c.etiqueta)}"></option>`).join("");
  const cartas=leerCartas();
  $("cartaSelect").innerHTML=cartas.length
    ? cartas.map(c=>`<option value="${c.id}">${esc(c.datos.nombre||"Carta sin nombre")} · ${esc(c.datos.resumenFecha||"")}</option>`).join("")
    : "<option>Sin cartas guardadas</option>";
  if(!cartas.length){document.querySelector('[data-fuente="guardada"]').disabled=true;cambiarFuente("manual")}
  else calcular(true);
  document.querySelectorAll("[data-fuente]").forEach(b=>b.addEventListener("click",()=>cambiarFuente(b.dataset.fuente)));
  $("calcular").addEventListener("click",()=>calcular(true));
  $("cartaSelect").addEventListener("change",()=>calcular(true));
  ["selTerminos","selTriplicidad"].forEach(id=>$(id).addEventListener("change",()=>carta&&calcular(false)));
  $("nEjemplo").addEventListener("click",()=>{
    $("nNombre").value="Ejemplo de exploración";$("nFecha").value="1990-03-21";$("nHora").value="06:30";$("nLugar").value="Ciudad de México, México";});
}
iniciar();
})();
