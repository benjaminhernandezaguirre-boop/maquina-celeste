'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validar,renderIndex,renderSign,SIGNOS}=require('../scripts/generar-horoscopo.cjs');
const {estadoEdicion}=require('../app/horoscopo.js');
const data=require('../data/horoscopos/2026-09-13.json');

test('la edición no puede publicarse con signos duplicados o referencias astronómicas rotas',()=>{
  assert.equal(validar(data),data);
  const duplicado=structuredClone(data);duplicado.signs[11]=duplicado.signs[0];
  assert.throws(()=>validar(duplicado),/doce signos/);
  const eventoRoto=structuredClone(data);eventoRoto.signs[0].eventIds.push('no-existe');
  assert.throws(()=>validar(eventoRoto),/Eventos de referencia/);
  const fuera=structuredClone(data);fuera.events[0].date='2026-09-20';
  assert.throws(()=>validar(fuera),/fuera de la edición/);
});

test('cada lectura ofrece contenido completo y navegación a los doce signos sin JavaScript',()=>{
  for(const sign of data.signs){
    const html=renderSign(data,sign);
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    for(const slug of SIGNOS)assert.ok(html.includes(`href="/horoscopo-semanal/${slug}"`),slug);
    for(const nombre of ['Amor','Trabajo','Dinero'])assert.ok(html.includes(`</span>${nombre}</h2>`),nombre);
    for(const id of sign.eventIds)assert.ok(html.includes(`id="evento-${id}"`),id);
    assert.ok(html.includes('13 al 19 de septiembre de 2026'));
    assert.ok(html.includes('Edición publicada'));
    assert.ok(!html.includes('Semana en curso'));
    assert.ok(html.includes(`<link rel="canonical" href="https://astroplanetario.com/horoscopo-semanal/${sign.slug}">`));
    const ld=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(ld['@graph'][0].temporalCoverage,'2026-09-13/2026-09-19');
    assert.equal(ld['@graph'][0].datePublished,data.publishedAt);
    assert.equal(fs.readFileSync(path.join(__dirname,'..','horoscopo-semanal',sign.slug+'.html'),'utf8'),html,'La salida estática debe estar regenerada.');
  }
  assert.equal(fs.readFileSync(path.join(__dirname,'..','horoscopo-semanal.html'),'utf8'),renderIndex(data));
});

test('la semana caduca en la zona editorial, aunque UTC haya cambiado de día',()=>{
  const status=iso=>estadoEdicion(data.start,data.end,new Date(iso),data.timezone);
  assert.equal(status('2026-09-13T05:59:59Z'),'proxima');
  assert.equal(status('2026-09-13T06:00:00Z'),'actual');
  assert.equal(status('2026-09-20T05:59:59Z'),'actual');
  assert.equal(status('2026-09-20T06:00:00Z'),'anterior');
  assert.equal(status('2027-01-01T12:00:00Z'),'anterior');
});

test('el contenido editorial se trata como texto al generar HTML',()=>{
  const sign={...data.signs[0],summary:'<script>alert("x")</script>',love:'A & B'};
  const html=renderSign(data,sign);
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'));
  assert.ok(html.includes('A &amp; B'));
  assert.ok(!html.includes('<script>alert("x")</script>'));
});
