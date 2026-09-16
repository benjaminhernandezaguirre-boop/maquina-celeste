'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {signos,signoDeFecha}=require('../app/cumpleanos.js');

test('temporadas editoriales cubren todos los límites, año nuevo y febrero bisiesto',()=>{
  const limites=[[1,20,'capricornio','acuario'],[2,19,'acuario','piscis'],[3,21,'piscis','aries'],[4,20,'aries','tauro'],[5,21,'tauro','geminis'],[6,21,'geminis','cancer'],[7,23,'cancer','leo'],[8,23,'leo','virgo'],[9,23,'virgo','libra'],[10,23,'libra','escorpio'],[11,22,'escorpio','sagitario'],[12,22,'sagitario','capricornio']];
  for(const [mes,dia,anterior,nuevo] of limites){
    assert.equal(signoDeFecha(new Date(2026,mes-1,dia-1,23,59)).slug,anterior);
    assert.equal(signoDeFecha(new Date(2026,mes-1,dia,0,0)).slug,nuevo);
  }
  assert.equal(signoDeFecha(new Date(2026,11,31)).slug,'capricornio');
  assert.equal(signoDeFecha(new Date(2027,0,1)).slug,'capricornio');
  assert.equal(signoDeFecha(new Date(2024,1,29)).slug,'piscis');
  assert.equal(signoDeFecha(new Date('inválida')),null);
});

test('medianoche y retorno a la pestaña actualizan el saludo sin precargar otros signos',()=>{
  let ahora=new Date(2026,8,22,23,59,59),imagen=null,timer=null;
  const fuentes=[],eventos=[],listeners={};
  const host={dataset:{},classList:{add(){}},querySelector:()=>imagen,appendChild:i=>{imagen=i;}};
  class Reloj extends Date{constructor(...args){super(...(args.length?args:[ahora.getTime()]));}}
  const document={readyState:'complete',hidden:false,querySelectorAll:()=>[host],
    createElement:()=>({set src(v){fuentes.push(v);this._src=v;},get src(){return this._src;}}),
    addEventListener:(tipo,fn)=>listeners[tipo]=fn};
  const c={Date:Reloj,document,clearTimeout(){},setTimeout:(fn,ms)=>{timer={fn,ms};return 1;},
    CustomEvent:class{constructor(type,data){this.type=type;Object.assign(this,data);}},
    dispatchEvent:e=>eventos.push(e),addEventListener:(tipo,fn)=>listeners[tipo]=fn};
  c.window=c;vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/cumpleanos.js'),'utf8'),c);
  assert.equal(fuentes.length,1);assert.match(fuentes[0],/virgo\.webp/);
  assert.equal(imagen.alt,'¡Feliz cumpleaños, Virgo!');
  assert.ok(timer.ms>0&&timer.ms<2000);
  ahora=new Date(2026,8,23);timer.fn();
  assert.equal(fuentes.length,2);assert.match(fuentes[1],/libra\.webp/);
  assert.equal(imagen.alt,'¡Feliz cumpleaños, Libra!');
  listeners.pageshow();assert.equal(fuentes.length,2,'no repite la imagen de la misma temporada');
  ahora=new Date(2026,10,23);listeners.visibilitychange();
  assert.match(fuentes.at(-1),/sagitario\.webp/);
  assert.equal(eventos.at(-1).detail.signo.slug,'sagitario');
  assert.equal(document.querySelectorAll().length,1);
});

test('los doce saludos usan imágenes WebP existentes y ligeras',()=>{
  for(const s of signos){
    const bytes=fs.readFileSync(path.join(__dirname,'../assets/cumpleanos',s.slug+'.webp'));
    assert.equal(bytes.subarray(0,4).toString(),'RIFF');
    assert.equal(bytes.subarray(8,12).toString(),'WEBP');
    assert.ok(bytes.length<200001,s.slug+' supera el presupuesto de descarga');
  }
});
