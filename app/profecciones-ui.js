/* Interfaz de la calculadora de profecciones anuales. */
(function(){
"use strict";
const E=window.Efem,P=window.Profecciones,D=window.Dignidades||null,$=id=>document.getElementById(id),CARTAS="astroplanetario-cartas";
if(!E||!P){document.body.textContent="No se pudo cargar el motor de profecciones.";return}
let fuente="guardada",carta=null,resultado=null;
const meses=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const esc=s=>E.escaparHTML(String(s==null?"":s));

function leerCartas(){try{const a=JSON.parse(localStorage.getItem(CARTAS)||"[]");return Array.isArray(a)?a.filter(c=>c&&typeof c.id==="string"&&E.cartaValida(c.datos)):[]}catch(e){return[]}}
function normal(s){return(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().trim()}
function ciudadDe(texto){const ex=E.CIUDADES.filter(c=>normal(c.etiqueta)===normal(texto));if(ex.length===1)return ex[0];const n=E.CIUDADES.filter(c=>normal(c.n)===normal(texto));return n.length===1?n[0]:null}
function fechaLarga(ms,tz,hora){return new Intl.DateTimeFormat("es-MX",{timeZone:tz,day:"numeric",month:"short",year:"numeric",...(hora?{hour:"2-digit",minute:"2-digit"}:{})}).format(new Date(ms))}
function fechaCorta(ms,tz){return new Intl.DateTimeFormat("es-MX",{timeZone:tz,day:"2-digit",month:"short",year:"numeric"}).format(new Date(ms))}
function isoLocal(ms,tz){const p=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return{fecha:`${p.year}-${p.month}-${p.day}`,hora:`${p.hour}:${p.minute}`}}
const posZod=lon=>{const p=E.posZod(lon);return`${p.signo.g} ${p.texto}`};

function datosManuales(){
  const f=$("nFecha").value,t=$("nHora").value,lugar=$("nLugar").value.trim();
  if(!f)throw new Error("Falta la fecha de nacimiento.");
  if(!t)throw new Error("Falta la hora exacta de nacimiento.");
  const ciudad=ciudadDe(lugar);
  if(!ciudad)throw new Error("Elige una ciudad completa de la lista para aplicar sus coordenadas y zona horaria.");
  const[anio,mes,dia]=f.split("-").map(Number),[hora,min]=t.split(":").map(Number);
  return{nombre:$("nNombre").value.trim()||"Carta sin nombre",anio,mes,dia,hora,min,horaConocida:true,
    lat:ciudad.lat,lon:ciudad.lon,tz:ciudad.tz,lugarTexto:ciudad.etiqueta,sistema:"signos",factorOrbe:1,
    desambiguacion:$("nOcurrencia").value,
    resumenFecha:`${dia} de ${meses[mes-1]} de ${anio} · ${String(hora).padStart(2,"0")}:${String(min).padStart(2,"0")}`};
}
function cartaElegida(){
  if(fuente==="manual")return datosManuales();
  const el=leerCartas().find(c=>c.id===$("cartaSelect").value);
  if(!el)throw new Error("Selecciona una carta guardada.");
  return el.datos;
}
function fechaObjetivo(tz){
  const f=$("fechaObjetivo").value,t=$("horaObjetivo").value||"12:00";
  if(!f)throw new Error("Elige la fecha que quieres explorar.");
  const[y,m,d]=f.split("-").map(Number),[h,mi]=t.split(":").map(Number);
  return E.localAUTC(y,m,d,h,mi,tz,"earlier");
}
function mostrarError(e){
  $("estado").className="estado error";$("estado").textContent=e.message||String(e);$("salida").hidden=true;
  if(/dos veces/.test(e.message||"")){$("campoOcurrencia").hidden=false;$("nOcurrencia").focus()}
}
function calcular(nueva){
  try{
    if(nueva!==false)carta=P.prepararCarta(cartaElegida(),E);
    if(!carta)throw new Error("Selecciona los datos de nacimiento.");
    const ms=fechaObjetivo(carta.datos.tz);
    resultado=P.calcular(carta,ms,{E,alinearRevolucion:$("alinear").checked});
    $("estado").className="estado";
    $("estado").textContent="Profección calculada con el criterio indicado al final de la página.";
    render();
  }catch(e){mostrarError(e)}
}
function irA(ms){
  const p=isoLocal(ms,carta.datos.tz);$("fechaObjetivo").value=p.fecha;$("horaObjetivo").value=p.hora;
  calcular(false);
  $("salida").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
}

/* ---------- pintado ---------- */
function renderResumen(){
  const d=carta.datos,a=resultado.anual;
  $("resumen").innerHTML=`
  <div class="dato"><small>Carta</small><b>${esc(d.nombre||"Carta sin nombre")}</b><span>${esc(d.lugarTexto||"")}</span></div>
  <div class="dato"><small>Edad cumplida</small><b>${a.edad} años</b><span>${fechaCorta(a.inicio,d.tz)} → ${fechaCorta(a.fin,d.tz)}</span></div>
  <div class="dato"><small>Signo profectado</small><b>${P.GLIFOS[a.signo]} ${P.SIGNOS[a.signo]}</b><span>Casa ${resultado.casaInfo.n} · ${esc(resultado.casaInfo.titulo)}</span></div>
  <div class="dato"><small>Señor del año</small><b>${resultado.senorNatal.simbolo} ${esc(a.senor)}</b><span>Natal en ${P.SIGNOS[resultado.senorNatal.signo]}, casa ${resultado.senorNatal.casa}</span></div>`;
}
function renderAnillo(){
  const a=resultado.anual,nodos=[];
  for(let k=0;k<12;k++){
    const signo=P.mod(carta.ascSigno+k,12),activo=k===P.mod(a.edad,12);
    /* La casa I va a la izquierda y las casas avanzan en sentido
       antihorario, como en cualquier rueda de carta. */
    const ang=-(90+k*30);
    nodos.push(`<button type="button" class="nodo${activo?" activo":""}" style="--a:${ang}deg" data-salta="${k}" title="Casa ${P.CASAS[k].n}: ${esc(P.CASAS[k].titulo)}">
      <span>${P.GLIFOS[signo]}</span><small>${P.CASAS[k].n}</small></button>`);
  }
  $("anillo").innerHTML=nodos.join("")+
   `<div class="centro"><small>Año ${a.edad}</small><b>${P.SIGNOS[a.signo]}</b><span>Casa ${resultado.casaInfo.n}</span></div>`;
}
function renderAno(){
  const a=resultado.anual,s=resultado.senorNatal,c=resultado.casaInfo;
  const dig=D&&D.estadoDe?D.estadoDe(a.senor,s.lon,carta.diurna,{}):null;
  $("ano").innerHTML=`
  <h2>El año ${a.edad}: casa ${c.n}, ${esc(c.titulo.toLowerCase())}</h2>
  <p>Del <b>${fechaLarga(a.inicio,carta.datos.tz)}</b> al <b>${fechaLarga(a.fin,carta.datos.tz)}</b>. La carta se profecta a <b>${P.SIGNOS[a.signo]}</b>, que cae en la <b>casa ${c.n}</b>: ${esc(c.tema)}.</p>
  <div class="rejilla">
    <div class="tarjeta"><small>Señor del año</small><b>${s.simbolo} ${esc(a.senor)}</b><span>${esc(s.tema)}</span></div>
    <div class="tarjeta"><small>Su posición natal</small><b>${posZod(s.lon)}</b><span>${P.SIGNOS[s.signo]}, casa ${s.casa}${s.enProfectado?" — y además está en el signo profectado":""}</span></div>
    ${dig?`<div class="tarjeta"><small>Su condición esencial</small><b>${esc(dig.resumen)}</b><span>${dig.puntuacion>0?"+":""}${dig.puntuacion} puntos ptolemaicos · <a href="/dignidades">qué significa</a></span></div>`:""}
    <div class="tarjeta"><small>Profección del mes</small><b>${P.GLIFOS[resultado.mensual.signo]} ${P.SIGNOS[resultado.mensual.signo]}</b><span>Casa ${resultado.casaMensual.n} · señor ${esc(resultado.mensual.senor)}</span></div>
  </div>`;
}
function renderActivados(){
  const a=resultado.anual;
  const act=resultado.activados.length
    ? resultado.activados.map(x=>`<div class="tarjeta"><small>En el signo profectado</small><b>${esc(x.nombre)}</b><span>${posZod(x.lon)} · casa natal ${x.casa}</span></div>`).join("")
    : `<div class="tarjeta"><small>En el signo profectado</small><b>Ningún planeta</b><span>El signo está vacío en la carta natal: el año se lee sobre todo por el señor del año.</span></div>`;
  const test=resultado.testigos.map(t=>`<div class="tarjeta"><small>${esc(t.aspecto)}</small><b>${esc(t.nombre)}</b><span>desde ${P.SIGNOS[t.signo]}</span></div>`).join("");
  $("activados").innerHTML=`<h2>Quién participa este año</h2>
  <p>Los planetas que la tradición considera implicados: los que ocupan el signo profectado y los que lo ven por configuración de signos enteros.</p>
  <div class="rejilla">${act}${test}</div>`;
}
function renderMeses(){
  const tz=carta.datos.tz;
  $("meses").innerHTML=resultado.meses.map((m,i)=>{
    const activo=m.inicio===resultado.mensual.inicio;
    return`<button type="button" class="mes${activo?" activo":""}" data-ir="${Math.round((m.inicio+m.fin)/2)}">
      <span>${P.GLIFOS[m.signo]}</span><b>Casa ${P.CASAS[m.casa-1].n}</b>
      <small>${fechaCorta(m.inicio,tz)}</small><small>${esc(m.senor)}</small></button>`;
  }).join("");
}
function renderVida(){
  const tz=carta.datos.tz,hoy=resultado.anual.edad;
  const filas=P.tablaDeVida(carta,0,90,E,$("alinear").checked).map(f=>
    `<tr${f.edad===hoy?' class="ahora"':''}><td class="num">${f.edad}</td><td class="glifo">${f.glifo}</td><td>${esc(f.nombreSigno)}</td>
     <td>${P.CASAS[f.casa-1].n}</td><td>${esc(f.titulo)}</td><td>${esc(f.senor)}</td>
     <td class="num">${fechaCorta(f.inicio,tz)}</td>
     <td><button type="button" class="boton sec mini" data-ir="${Math.round((f.inicio+f.fin)/2)}">Ver</button></td></tr>`).join("");
  $("vidaCuerpo").innerHTML=filas;
}
function render(){renderResumen();renderAnillo();renderAno();renderActivados();renderMeses();renderVida();$("salida").hidden=false}

/* ---------- arranque ---------- */
function cambiarFuente(n){
  fuente=n;
  document.querySelectorAll("[data-fuente]").forEach(b=>b.classList.toggle("activo",b.dataset.fuente===n));
  $("panelGuardada").hidden=n!=="guardada";$("panelManual").hidden=n!=="manual";
}
function iniciar(){
  $("ciudades").innerHTML=E.CIUDADES.map(c=>`<option value="${esc(c.etiqueta)}"></option>`).join("");
  const hoy=new Date();
  $("fechaObjetivo").value=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
  $("horaObjetivo").value="12:00";
  const cartas=leerCartas();
  $("cartaSelect").innerHTML=cartas.length
    ? cartas.map(c=>`<option value="${c.id}">${esc(c.datos.nombre||"Carta sin nombre")} · ${esc(c.datos.resumenFecha||"")}</option>`).join("")
    : "<option>Sin cartas guardadas</option>";
  if(!cartas.length){document.querySelector('[data-fuente="guardada"]').disabled=true;cambiarFuente("manual")}
  else calcular(true);
  document.querySelectorAll("[data-fuente]").forEach(b=>b.addEventListener("click",()=>cambiarFuente(b.dataset.fuente)));
  $("calcular").addEventListener("click",()=>calcular(true));
  $("cartaSelect").addEventListener("change",()=>calcular(true));
  $("alinear").addEventListener("change",()=>carta&&calcular(false));
  $("nEjemplo").addEventListener("click",()=>{
    $("nNombre").value="Ejemplo de exploración";$("nFecha").value="1990-03-21";$("nHora").value="06:30";$("nLugar").value="Ciudad de México, México";});
  $("salida").addEventListener("click",e=>{
    const ir=e.target.closest("[data-ir]");if(ir){irA(Number(ir.dataset.ir));return}
    const salta=e.target.closest("[data-salta]");
    if(salta&&carta){
      const casa=Number(salta.dataset.salta),actual=resultado.anual.edad;
      let edad=actual-P.mod(actual,12)+casa; if(edad<0)edad+=12;
      const a=P.anual(carta,edad,E,$("alinear").checked);
      irA(Math.round((a.inicio+a.fin)/2));
    }
  });
}
iniciar();
})();
