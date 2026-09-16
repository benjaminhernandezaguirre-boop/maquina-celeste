#!/usr/bin/env node
'use strict';

// Publica una edición explícita. Las anteriores se conservan en data/horoscopos.
// Uso: node scripts/generar-horoscopo.cjs --edition 2026-09-13
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const ORIGIN='https://astroplanetario.com';
const {signos:temporadas}=require('../app/cumpleanos.js');
const SIGNOS=['aries','tauro','geminis','cancer','leo','virgo','libra','escorpio','sagitario','capricornio','acuario','piscis'];
const AVISO='Lectura simbólica general por signo solar; casas solares por signos enteros, no casas natales. No asegura acontecimientos ni resultados económicos.';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const schema=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const fecha=date=>new Date(date+'T12:00:00Z');
const formatDate=date=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(fecha(date));
const fechaCorta=date=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',timeZone:'UTC'}).format(fecha(date));
const referenciaUTC=utc=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'UTC'}).format(new Date(utc));
function rango(data){
  const a=fecha(data.start),b=fecha(data.end);
  if(a.getUTCMonth()===b.getUTCMonth()&&a.getUTCFullYear()===b.getUTCFullYear())return `${a.getUTCDate()} al ${formatDate(data.end)}`;
  return `${formatDate(data.start)} al ${formatDate(data.end)}`;
}
function validar(data){
  for(const campo of ['id','start','end','publishedAt','timezone','title','intro','methodology'])if(typeof data[campo]!=='string'||!data[campo].trim())throw Error(`Falta ${campo} en la edición.`);
  for(const campo of ['start','end'])if(!/^\d{4}-\d{2}-\d{2}$/.test(data[campo])||Number.isNaN(fecha(data[campo]).getTime())||fecha(data[campo]).toISOString().slice(0,10)!==data[campo])throw Error(`Fecha inválida: ${campo}.`);
  if(data.start>data.end)throw Error('El final de la edición precede al inicio.');
  if(!Array.isArray(data.signs)||data.signs.length!==12||new Set(data.signs.map(s=>s.slug)).size!==12||SIGNOS.some(slug=>!data.signs.some(s=>s.slug===slug)))throw Error('La edición debe contener los doce signos sin duplicados.');
  if(!Array.isArray(data.events)||!data.events.length)throw Error('Faltan los eventos verificados de la semana.');
  const eventos=new Set();
  for(const evento of data.events){
    if(!/^[a-z0-9-]+$/.test(evento.id)||eventos.has(evento.id))throw Error('Identificador de evento inválido o repetido.');
    eventos.add(evento.id);
    if(!evento.label||!evento.detail||!/^\d{4}-\d{2}-\d{2}$/.test(evento.date)||evento.date<data.start||evento.date>data.end)throw Error(`Evento fuera de la edición o incompleto: ${evento.id}.`);
  }
  if(!Array.isArray(data.sources)||!data.sources.length)throw Error('La edición necesita fuentes.');
  for(const fuente of data.sources){
    if(!fuente.label||!/^https:\/\//.test(fuente.url))throw Error('Fuente inválida.');
  }
  for(const signo of data.signs){
    for(const campo of ['name','symbol','element','headline','summary','love','work','money','reflection'])if(typeof signo[campo]!=='string'||!signo[campo].trim())throw Error(`Falta ${campo} de ${signo.slug}.`);
    if(!['tierra','fuego','aire','agua'].includes(signo.element.toLowerCase()))throw Error(`Elemento inválido de ${signo.slug}.`);
    if(!Array.isArray(signo.eventIds)||!signo.eventIds.length||signo.eventIds.some(id=>!eventos.has(id)))throw Error(`Eventos de referencia inválidos de ${signo.slug}.`);
    if(!Array.isArray(signo.houses)||signo.houses.some(c=>typeof c!=='string'))throw Error(`Casas solares inválidas de ${signo.slug}.`);
  }
  return data;
}
function estado(data){return `<span class="hs-estado" data-edicion-inicio="${esc(data.start)}" data-edicion-fin="${esc(data.end)}" data-edicion-zona="${esc(data.timezone)}">Edición publicada</span>`;}
function cabecera(){return `<a class="saltar" href="#contenido">Saltar al contenido</a>
<header class="ancho cabecera editorial-cabecera editorial-franja"><a class="marca" href="/" aria-label="Astroplanetario, volver al planetario"><svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="16" cy="16" r="12"/><ellipse cx="16" cy="16" rx="5" ry="12"/><path d="M4 16h24M6 9h20M6 23h20"/></svg><span>Astroplanetario<small>Un cielo, muchas perspectivas</small></span></a><button type="button" class="theme-toggle" id="themeToggle" aria-label="Cambiar tema">Cambiar tema</button></header>`;}
function pie(){return `<footer class="ancho pie editorial-pie editorial-franja"><div>Astroplanetario · Un cielo, muchas perspectivas<span class="firma-instituto">Un proyecto del <a href="https://tarot-academy-theta.vercel.app/" target="_blank" rel="noopener">Instituto de Artes Esotéricas y Saberes Ancestrales</a></span></div><div><a href="/predicciones">Predicciones</a> · <a href="/herramientas">Todas las herramientas</a> · <a href="/">Planetario</a></div></footer>`;}
function documento(data,{title,description,url,image,body,sign}){
  const migas=[{name:'Astroplanetario',url:'/'},{name:'Predicciones',url:'/predicciones'},{name:'Horóscopo semanal',url:'/horoscopo-semanal'}];
  if(sign)migas.push({name:sign.name,url});
  const entity={'@type':sign?'Article':'CollectionPage','@id':ORIGIN+url+'#pagina',url:ORIGIN+url,name:title,headline:title,description,inLanguage:'es-MX',image:ORIGIN+image,datePublished:data.publishedAt,dateModified:data.publishedAt,isPartOf:{'@id':ORIGIN+'/#sitio'},...(sign?{author:{'@type':'Organization',name:'Astroplanetario',url:ORIGIN},publisher:{'@type':'Organization',name:'Astroplanetario',url:ORIGIN},temporalCoverage:`${data.start}/${data.end}`,articleSection:'Horóscopo semanal',about:{'@type':'Thing',name:sign.name}}:{hasPart:data.signs.map(s=>({'@type':'Article',name:`Horóscopo de ${s.name}: ${rango(data)}`,url:ORIGIN+'/horoscopo-semanal/'+s.slug}))})};
  return `<!doctype html>
<html lang="es-MX" data-studio-theme="light" data-editorial="horoscopo">
<head>
<meta charset="utf-8">
<script>(()=>{let t="light";try{const s=localStorage.getItem("astro-studio-theme");if(s==="light"||s==="dark")t=s}catch{}document.documentElement.dataset.studioTheme=t})()</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)} | Astroplanetario</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${ORIGIN+url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#F0E8D8">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="${sign?'article':'website'}">
<meta property="og:locale" content="es_MX"><meta property="og:site_name" content="Astroplanetario">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${ORIGIN+url}"><meta property="og:image" content="${ORIGIN+image}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${ORIGIN+image}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&amp;family=Spectral:ital,wght@0,300;0,400;0,600;1,400&amp;family=IBM+Plex+Mono:wght@400;500&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/app/herramientas.css?v=20260915"><link rel="stylesheet" href="/app/navegacion.css?v=20260916">
<link rel="stylesheet" href="/app/horoscopo.css?v=20260916">
<script src="/app/tema.js?v=20260915" defer></script><script src="/app/navegacion.js?v=20260916" defer></script>
<script src="/app/horoscopo.js?v=20260916" defer></script>
<script type="application/ld+json">${schema({'@context':'https://schema.org','@graph':[entity,{'@type':'BreadcrumbList',itemListElement:migas.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:ORIGIN+item.url}))}]})}</script>
<link rel="stylesheet" href="/app/tema-editorial.css?v=20260916">
<link rel="stylesheet" href="/app/editorial-horoscopo.css?v=20260916">
</head>
<body>${cabecera()}
<main id="contenido" class="ancho">
<nav class="hf-migas" aria-label="Ruta de navegación">${migas.slice(1).map((item,i,items)=>`${i?'<span aria-hidden="true">/</span>':''}${i===items.length-1?`<span aria-current="page">${esc(item.name)}</span>`:`<a href="${item.url}">${esc(item.name)}</a>`}`).join('')}</nav>
${body}
</main>${pie()}
</body></html>
`;
}
function fuentes(data){return `<ul class="hs-fuentes">${data.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`).join('')}</ul>`;}
function metodo(data){return `<section class="hs-metodo editorial-salvia editorial-franja" id="como-lo-leemos"><div><p class="ceja">Una lectura con contexto</p><h2>Cómo elaboramos esta edición</h2><p>${esc(data.methodology)}</p><p>Las fechas y posiciones del cielo se contrastan con las fuentes. La lectura de amor, trabajo y dinero es una interpretación editorial de Astroplanetario.</p></div><div><h3>Fuentes del cielo de la semana</h3>${fuentes(data)}<p>Fechas de esta edición: ${esc(data.timezone)}. Cuando se indica una hora, se conserva también su referencia UTC en el detalle del evento.</p></div></section>`;}
function eventos(data,lista=data.events){return `<section class="hs-seccion" id="cielo"><div class="hs-seccion-cabecera"><div><p class="ceja">El contexto de la lectura</p><h2>El cielo de esta semana</h2></div><p>Aspectos y fase lunar seleccionados para esta edición. Consulta sus fechas antes de relacionarlos con tu experiencia.</p></div><div class="hs-calendario">${lista.map(e=>`<article class="hs-evento" id="evento-${esc(e.id)}"><time datetime="${esc(e.date)}">${esc(fechaCorta(e.date))}</time><h3>${esc(e.label)}</h3><p>${esc(e.detail)}</p>${e.utc?`<p class="hs-hora-utc">Referencia UTC · <time datetime="${esc(e.utc)}">${esc(referenciaUTC(e.utc))}</time></p>`:''}</article>`).join('')}</div></section>`;}
function selector(data,actual){return `<nav class="hs-otras editorial-indice editorial-franja" aria-label="Horóscopo de los doce signos"><p class="ceja">También puedes leer otro signo</p><div class="hs-otras-lista">${data.signs.map(s=>`<a href="/horoscopo-semanal/${s.slug}"${s.slug===actual?' aria-current="page"':''}>${esc(s.name)}</a>`).join('')}</div></nav>`;}
function portada(slug,nombre,caption){return `<figure class="hs-portada"><img src="/assets/zodiaco/${slug}-celestial.webp" width="600" height="750" alt="Ilustración de ${esc(nombre)}" fetchpriority="high" decoding="async"><figcaption>${esc(caption)}</figcaption></figure>`;}
function renderIndex(data){
  const mitad=fecha(data.start);mitad.setUTCDate(mitad.getUTCDate()+3);
  const md=(mitad.getUTCMonth()+1)*100+mitad.getUTCDate();
  const temporada=temporadas.find(s=>s.inicio<s.fin?md>=s.inicio&&md<s.fin:md>=s.inicio||md<s.fin);
  const rangoTexto=rango(data),portadaSigno=data.signs.find(s=>s.slug===temporada.slug);
  const title=`Horóscopo semanal del ${rangoTexto}`;
  const body=`<section class="hs-hero editorial-hero editorial-franja" aria-labelledby="titulo"><div><p class="ceja">Predicciones · Los doce signos</p><h1 id="titulo">Tu signo.<em>Una semana por explorar.</em></h1><p class="hs-fechas">Del <time datetime="${data.start}">${esc(rangoTexto)}</time></p><p class="hs-entrada">${esc(data.intro)}</p><div class="hs-edicion">${estado(data)}<span>Publicado el ${esc(formatDate(data.publishedAt.slice(0,10)))}</span></div><div class="hf-acciones"><a class="hf-boton principal" href="#signos">Elegir mi signo ↓</a><a class="hf-boton" href="#cielo">Ver los aspectos de la semana</a></div></div>${portada(portadaSigno.slug,portadaSigno.name,'Doce miradas al mismo cielo')}</section>
<section class="hs-cielo editorial-indice editorial-franja" aria-label="Momentos destacados"><p class="ceja">Tres claves<br>de la semana</p><div class="hs-cielo-lista">${data.events.slice(0,3).map(e=>`<a href="#evento-${esc(e.id)}"><time datetime="${esc(e.date)}">${esc(fechaCorta(e.date))}</time>${esc(e.label)} <span aria-hidden="true">↗</span></a>`).join('')}</div></section>
<section class="hs-seccion" id="signos"><div class="hs-seccion-cabecera"><div><p class="ceja">Amor · Trabajo · Dinero</p><h2>Elige tu signo zodiacal</h2></div><p>Empieza por tu signo solar. Encontrarás una lectura general y los movimientos planetarios que le dan contexto.</p></div><div class="hs-signos">${data.signs.map(s=>`<a class="hs-signo" data-elemento="${esc(s.element.toLowerCase())}" href="/horoscopo-semanal/${s.slug}"><div class="hs-signo-arte"><img src="/assets/zodiaco/${s.slug}-celestial.webp" alt="" width="600" height="450" loading="lazy" decoding="async"></div><p class="hs-elemento">${esc(s.element)}</p><h3>${esc(s.name)} <span aria-hidden="true">${esc(s.symbol.replace(/[\uFE0E\uFE0F]/g,''))}&#xFE0E;</span></h3><p>${esc(s.headline)}</p></a>`).join('')}</div></section>
${eventos(data)}${metodo(data)}
<section class="hf-cierre editorial-petroleo editorial-franja"><div><p class="ceja">Tu cielo personal</p><h2>Hay mucho más que tu signo solar.</h2><p>Tu carta natal y tus tránsitos consideran el momento y lugar de nacimiento.</p></div><a class="hf-boton" href="/astroplanetario.html?view=natal&amp;tab=transitos">Explorar mis tránsitos →</a></section>`;
  return documento(data,{title,description:`Horóscopo del ${rangoTexto} para los doce signos: amor, trabajo, dinero y aspectos planetarios con sus fuentes.`,url:'/horoscopo-semanal',image:`/assets/zodiaco/${portadaSigno.slug}-celestial.webp`,body});
}
function renderSign(data,sign){
  const seleccion=data.events.filter(e=>sign.eventIds.includes(e.id)),rangoTexto=rango(data);
  const title=`Horóscopo de ${sign.name}: ${rangoTexto}`;
  const body=`<section class="hs-hero editorial-hero editorial-franja" aria-labelledby="titulo" data-elemento="${esc(sign.element.toLowerCase())}"><div><p class="ceja">Horóscopo semanal · ${esc(sign.element)}</p><h1 id="titulo">${esc(sign.name)}<em>${esc(sign.headline)}</em></h1><p class="hs-fechas">Del <time datetime="${data.start}">${esc(rangoTexto)}</time></p><p class="hs-entrada">${esc(sign.summary)}</p><div class="hs-edicion">${estado(data)}<span>Publicado el ${esc(formatDate(data.publishedAt.slice(0,10)))}</span></div><div class="hf-acciones"><a class="hf-boton principal" href="#lectura">Leer mi semana ↓</a><a class="hf-boton" href="/horoscopo-semanal">Los doce signos →</a></div></div>${portada(sign.slug,sign.name,`${sign.name} · ${sign.element}`)}</section>
${selector(data,sign.slug)}
<div class="hs-lectura" id="lectura"><div class="hs-ambitos">${[['amor','Amor',sign.love],['trabajo','Trabajo',sign.work],['dinero','Dinero',sign.money]].map(([id,label,text],i)=>`<section class="hs-ambito" id="${id}"><h2><span aria-hidden="true">0${i+1}</span>${label}</h2><p>${esc(text)}</p></section>`).join('')}<blockquote class="hs-reflexion editorial-salvia"><p class="ceja">Una reflexión para tu semana</p><p>${esc(sign.reflection)}</p></blockquote></div><aside class="hs-contexto editorial-salvia" aria-labelledby="contexto"><p class="ceja">Para situar la lectura</p><h2 id="contexto">Movimientos de referencia</h2><ul>${seleccion.map(e=>`<li><a href="#evento-${esc(e.id)}">${esc(e.label)}</a><br><small>${esc(fechaCorta(e.date))}</small></li>`).join('')}</ul>${sign.houses.length?`<details class="hs-casas"><summary>Casas solares utilizadas</summary><ul>${sign.houses.map(c=>`<li>${esc(c)}</li>`).join('')}</ul></details>`:''}<a class="hf-boton" href="#como-lo-leemos">Cómo elaboramos esta lectura ↓</a></aside></div>
${eventos(data,seleccion)}${metodo(data)}
<section class="hf-cierre editorial-petroleo editorial-franja"><div><p class="ceja">Una lectura más personal</p><h2>Explora tus propios tránsitos.</h2><p>Relaciona el cielo de una fecha con tu carta natal y sus casas.</p></div><a class="hf-boton" href="/astroplanetario.html?view=natal&amp;tab=transitos">Abrir mi carta natal →</a></section>`;
  return documento(data,{title,description:`${sign.name}, del ${rangoTexto}: ${sign.headline} Lectura de amor, trabajo y dinero con contexto planetario.`,url:'/horoscopo-semanal/'+sign.slug,image:`/assets/zodiaco/${sign.slug}-celestial.webp`,body,sign});
}
function generar(id,root=ROOT){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(id||''))throw Error('Indica una edición explícita: --edition AAAA-MM-DD.');
  const archivo=path.join(root,'data','horoscopos',id+'.json');
  const data=validar(JSON.parse(fs.readFileSync(archivo,'utf8').replace(/^\uFEFF/,'')));
  if(data.id!==id)throw Error('El identificador del archivo y de la edición no coinciden.');
  // Se renderiza todo antes de escribir para no publicar una edición incompleta.
  const salidas=[['horoscopo-semanal.html',renderIndex(data)],...data.signs.map(s=>[`horoscopo-semanal/${s.slug}.html`,renderSign(data,s)])];
  fs.mkdirSync(path.join(root,'horoscopo-semanal'),{recursive:true});
  for(const [nombre,html] of salidas)fs.writeFileSync(path.join(root,nombre),html,'utf8');
  return salidas.map(([nombre])=>nombre);
}
module.exports={validar,rango,renderIndex,renderSign,generar,AVISO,SIGNOS};
if(require.main===module){
  try{const args=process.argv.slice(2),i=args.indexOf('--edition');const archivos=generar(i>=0?args[i+1]:undefined);console.log(`Edición generada: ${archivos.length} páginas estáticas.`);}
  catch(error){console.error(error.message);process.exitCode=1;}
}
