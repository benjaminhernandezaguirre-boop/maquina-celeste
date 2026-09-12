const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('la guía ofrece metadatos, contenido y datos estructurados', () => {
  const html = read('lotes-arabigos.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/astroplanetario\.com\/lotes-arabigos">/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /Los siete lotes herméticos/);
  assert.match(html, /ASC \+ Luna − Sol/);
  assert.match(html, /Sol[\s\S]{0,160}sobre el horizonte/i);
  assert.match(html, /href="\/calculadora-lotes-arabigos"/);
});

test('la calculadora incluye los siete lotes y no evalúa fórmulas', () => {
  const html = read('lotes-arabigos-calculadora.html');
  const js = read('app/lotes-arabigos.js');
  for (const id of ['fortuna', 'espiritu', 'eros', 'necesidad', 'coraje', 'victoria', 'nemesis']) {
    assert.match(js, new RegExp(`id:\"${id}\"`));
  }
  assert.doesNotMatch(js, /\beval\s*\(|new Function\s*\(/);
  assert.match(js, /horaSidereaGw/);
  assert.match(js, /Sol bajo el horizonte/);
  assert.match(js, /astroplanetario-formulas-lotes/);
  assert.match(html, /id="ruedaLotes"/);
  assert.match(html, /Carta natal interactiva de lotes/);
  assert.match(js, /function dibujarRueda/);
  assert.match(js, /cuspide[\s\S]{0,80}angular/);
  const avanzados = js.match(/const AVANZADOS=\[([\s\S]*?)\];/);
  assert.ok(avanzados);
  assert.equal((avanzados[1].match(/\{id:/g) || []).length, 20);
});

test('una carta válida genera 7 lotes herméticos, dos grupos de 20 y una selección de 16', () => {
  const ids = ['themeToggle','cartaSelect','calcular','estado','salida','resumen','resultados','personalizados','nombreFormula','baseFormula','sumaFormula','restaFormula','invertirFormula','agregarFormula','sinCartas','ruedaLotes','leyendaLotes','detalleLote','tituloResultados','textoResultados','selectorLote'];
  const elemento = id => ({id,innerHTML:'',textContent:'',hidden:false,value:id==='cartaSelect'?'c1':'',checked:true,disabled:false,className:'',dataset:{},style:{},classList:{toggle(){}},listeners:{},addEventListener(t,f){this.listeners[t]=f},setAttribute(){},focus(){},closest(){return null},getBoundingClientRect(){return{left:0,top:0,width:500,height:500}}});
  const els = Object.fromEntries(ids.map(id => [id, elemento(id)]));
  const botones = ['hermeticos','avanzados','expansion','seleccion'].map(g => { const b=elemento(g); b.dataset.grupo=g; return b; });
  const carta={id:'c1',datos:{nombre:'Prueba',anio:1990,mes:6,dia:15,hora:12,min:0,horaConocida:true,lugarTexto:'Ciudad de México',lat:19.4326,lon:-99.1332,tz:'America/Mexico_City',desambiguacion:'reject',sistema:'placidio',factorOrbe:1,resumenFecha:'15 de junio de 1990',husoTexto:''}};
  const storage={'astroplanetario-cartas':JSON.stringify([carta])};
  const ctx={console,Intl,Date,Math,JSON,setTimeout,clearTimeout,matchMedia:()=>({matches:false}),localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},document:{documentElement:{dataset:{}},body:{textContent:''},getElementById:id=>els[id],querySelectorAll:q=>q==='[data-grupo]'?botones:[]},window:null};ctx.window=ctx;
  vm.createContext(ctx);vm.runInContext(read('app/efemerides.js'),ctx);vm.runInContext(read('app/lotes-arabigos.js'),ctx);
  assert.equal((els.ruedaLotes.innerHTML.match(/class="lote-marca/g)||[]).length,1);
  assert.equal((els.resultados.innerHTML.match(/<article/g)||[]).length,1);
  assert.match(els.resultados.innerHTML,/Aspectos cercanos que recibe/);
  botones[1].listeners.click();
  assert.equal((els.ruedaLotes.innerHTML.match(/class="lote-marca/g)||[]).length,1);
  assert.equal((els.resultados.innerHTML.match(/<article/g)||[]).length,1);
  assert.equal((els.selectorLote.innerHTML.match(/<option/g)||[]).length,20);
  botones[2].listeners.click();
  assert.equal((els.ruedaLotes.innerHTML.match(/class="lote-marca/g)||[]).length,1);
  assert.equal((els.resultados.innerHTML.match(/<article/g)||[]).length,1);
  assert.equal((els.selectorLote.innerHTML.match(/<option/g)||[]).length,20);
  assert.match(els.resultados.innerHTML,/Patrimonio/);
  assert.match(els.resultados.innerHTML,/Cúspide de casa 2/);
  assert.match(els.resultados.innerHTML,/Regente de casa 2/);
  els.selectorLote.value='viajes';
  els.selectorLote.listeners.change();
  assert.match(els.resultados.innerHTML,/Viajes/);
  botones[3].listeners.click();
  assert.equal((els.ruedaLotes.innerHTML.match(/class="lote-marca/g)||[]).length,1);
  assert.equal((els.selectorLote.innerHTML.match(/<option/g)||[]).length,16);
  assert.match(els.resultados.innerHTML,/Pilar de la carta/);
  els.selectorLote.value='rivalidadHermes';
  els.selectorLote.listeners.change();
  assert.match(els.resultados.innerHTML,/Cúspide de casa 12/);
  assert.match(els.resultados.innerHTML,/Regente de casa 12/);
  assert.match(els.estado.textContent,/63 lotes disponibles/);
});

test('el segundo paquete contiene 20 fórmulas y calcula cúspides y regentes tradicionales', () => {
  const js = read('app/lotes-arabigos.js');
  const expansion = js.match(/const EXPANSION=\[([\s\S]*?)\];/);
  assert.ok(expansion);
  assert.equal((expansion[1].match(/\{id:/g) || []).length, 20);
  assert.match(js, /p\.cusp2=casas\.c\[2\]/);
  assert.match(js, /p\.cusp7=casas\.c\[7\]/);
  assert.match(js, /p\.cusp9=casas\.c\[9\]/);
  assert.match(js, /SIGN_RULER_IDS\[Math\.floor/);
  assert.match(js, /p\.cancer15=105/);
});

test('la selección depurada contiene 16 lotes y evita fórmulas ambiguas', () => {
  const js = read('app/lotes-arabigos.js');
  const seleccion = js.match(/const SELECCION=\[([\s\S]*?)\];/);
  assert.ok(seleccion);
  assert.equal((seleccion[1].match(/\{id:/g) || []).length, 16);
  assert.match(seleccion[1], /id:"hijos"/);
  assert.match(seleccion[1], /id:"parejaHermes"/);
  assert.match(seleccion[1], /id:"rivalidadHermes"/);
  assert.doesNotMatch(seleccion[1], /syzy|lunación previa|lordAsc/);
  assert.match(js, /p\.cusp12=casas\.c\[12\]/);
  assert.match(js, /p\.senor12=regente\(p\.cusp12\)/);
});

test('la rueda muestra un solo lote y la ficha explica aspectos con orbes reducidos', () => {
  const html = read('lotes-arabigos-calculadora.html');
  const js = read('app/lotes-arabigos.js');
  assert.match(html, /un solo lote arábigo seleccionado/);
  assert.match(html, /aspectos cercanos que recibe/);
  assert.match(js, /const ASPECTOS=\[/);
  assert.match(js, /nombre:"Trígono"[\s\S]{0,80}angulo:120[\s\S]{0,80}orbe:2/);
  assert.match(js, /nombre:"Conjunción"[\s\S]{0,80}orbe:3/);
  assert.match(js, /nombre:"Oposición"[\s\S]{0,80}orbe:3/);
  assert.match(js, /function relevanciaAspecto/);
  assert.match(js, /El lote no emite el aspecto: lo recibe del planeta/);
  assert.doesNotMatch(js, /for\(const def of \[\.\.\.defs\]/);
});

test('Neptuno y las rutas públicas enlazan el nuevo módulo', () => {
  const home = read('index.html');
  const vercel = JSON.parse(read('vercel.json'));
  const sitemap = read('sitemap.xml');
  assert.match(home, /data-name="Neptuno"[^>]+href="\/lotes-arabigos"/);
  assert.ok(vercel.rewrites.some(r => r.source === '/lotes-arabigos'));
  assert.ok(vercel.rewrites.some(r => r.source === '/calculadora-lotes-arabigos'));
  assert.match(sitemap, /https:\/\/astroplanetario\.com\/lotes-arabigos/);
  assert.match(sitemap, /https:\/\/astroplanetario\.com\/calculadora-lotes-arabigos/);
});

