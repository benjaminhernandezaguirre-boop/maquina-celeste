'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {crear,normaliza}=require('../app/ciudades-motor.js');
const datos=JSON.parse(fs.readFileSync(path.join(__dirname,'../app/datos/ciudades-2026-09-15.json'),'utf8'));
const motor=crear(datos);
const porId=new Map(datos.filas.map(f=>[f[0],f]));

test('el catálogo mundial conserva IDs, coordenadas, referencias e identidad inequívoca',()=>{
  assert.ok(datos.filas.length>180000,'debe contener la cobertura mundial cities500');
  assert.equal(porId.size,datos.filas.length,'cada ID GeoNames o de compatibilidad es único');
  assert.match(datos.fuente,/GeoNames cities500/);
  assert.match(JSON.stringify(datos.licencia),/CC BY 4\.0/);
  const etiquetas=new Set(),paises=new Set();
  for(const f of datos.filas){
    assert.ok(Number.isSafeInteger(f[0])&&f[0]!==0,'identificador estable');
    assert.ok(typeof f[1]==='string'&&f[1].trim(),'nombre presente');
    assert.ok(Number.isInteger(f[2])&&typeof datos.regiones[f[2]]==='string','región existente');
    assert.ok(Number.isFinite(f[3])&&f[3]>=-90&&f[3]<=90,`latitud inválida para ${f[0]}`);
    assert.ok(Number.isFinite(f[4])&&f[4]>=-180&&f[4]<=180,`longitud inválida para ${f[0]}`);
    assert.ok(Number.isInteger(f[5])&&typeof datos.zonas[f[5]]==='string','zona existente');
    assert.ok(Number.isFinite(f[6])&&f[6]>=0,'población válida para ordenar');
    assert.equal(typeof f[7],'string','nombre ASCII opcional');
    const r=datos.regiones[f[2]],etiqueta=normaliza(f[1]+', '+r);
    assert.ok(!etiquetas.has(etiqueta),`etiqueta duplicada: ${f[1]}, ${r}`);
    etiquetas.add(etiqueta);
    const pais=r.match(/\(([A-Z]{2})\)/);if(pais)paises.add(pais[1]);
  }
  assert.ok(paises.size>200,'la ampliación abarca países y territorios de todo el mundo');
  // Validar cada zona una vez, no construir más de 235000 formateadores Intl.
  const zonas=new Set(datos.zonas);
  assert.equal(zonas.size,datos.zonas.length,'tabla de zonas deduplicada');
  for(const tz of zonas)assert.doesNotThrow(()=>new Intl.DateTimeFormat('es',{timeZone:tz}),`zona IANA no reconocida por este runtime: ${tz}`);
});

test('resolver conserva todas las etiquetas antiguas por identificador',()=>{
  assert.ok(datos.aliases.length>2900);
  for(const [etiqueta,id] of datos.aliases){
    assert.ok(porId.has(id),`alias huérfano: ${etiqueta}`);
    const r=motor.resolver(etiqueta);
    assert.equal(r.ciudad?.id,id,`la etiqueta guardada debe conservar su ciudad: ${etiqueta}`);
    assert.equal(r.ambiguas,false);
  }
});

test('acentos, ASCII y alfabetos Unicode conservan su significado',()=>{
  assert.equal(normaliza('  São—PAULO '),'sao paulo');
  assert.equal(normaliza('MÉRIDA'),'merida');
  assert.equal(normaliza('北京'),'北京');
  assert.equal(normaliza('Москва'),'москва');
  assert.equal(normaliza('العين'),'العين');
  assert.notEqual(normaliza('北京'),normaliza('東京'));
  const sao=motor.buscar('sao paulo')[0];
  assert.equal(sao.id,3448439);
  assert.equal(motor.resolver(sao.etiqueta.normalize('NFD')).ciudad.id,sao.id);
  const muestra=datos.filas.find(f=>f[7]&&normaliza(f[1])!==normaliza(f[7]));
  assert.ok(muestra,'el catálogo conserva transliteraciones ASCII adicionales');
  const seleccion=motor.buscar(muestra[7]).find(c=>c.id===muestra[0]);
  assert.ok(seleccion,`buscar por ASCII debe encontrar ${muestra[1]}`);
  assert.equal(motor.resolver(seleccion.etiqueta).ciudad.id,muestra[0]);
  // GeoNames suele elegir nombres latinos como principales; este caso verifica
  // que el motor también conserva alfabetos y su transliteración cuando existen.
  const unicode=crear({regiones:['China (CN)','Rusia (RU)'],zonas:['Asia/Shanghai','Europe/Moscow'],filas:[
    [1,'北京',0,39.9,116.4,0,100,'Beijing'],[2,'Москва',1,55.8,37.6,1,100,'Moskva']
  ]});
  assert.equal(unicode.buscar('北京')[0].id,1);
  assert.equal(unicode.resolver('Moskva').ciudad.id,2);
  assert.equal(unicode.resolver('МОСКВА').ciudad.id,2);
});

test('los homónimos requieren seleccionar una etiqueta, incluso dentro de la misma región',()=>{
  const cordoba=motor.resolver('Córdoba');
  assert.equal(cordoba.ciudad,null);
  assert.equal(cordoba.ambiguas,true);
  assert.ok(cordoba.total>=6);
  const jose=motor.resolver('San José');
  assert.ok(jose.total>40);
  assert.equal(jose.coincidencias.length,40,'ambigüedad no envía el catálogo entero');
  assert.equal(jose.ciudad,null);
  const colima=motor.buscar('Minatitlan Colima').filter(c=>/Colima/.test(c.r));
  assert.ok(colima.length>=2,'dos registros distintos comparten nombre y estado');
  for(const c of colima)assert.equal(motor.resolver(c.etiqueta).ciudad.id,c.id);
  assert.equal(motor.resolver('Puerto Escondido, Oaxaca, México').ciudad?.id,3520994,'etiqueta histórica previa a los códigos de país');
  assert.deepEqual(motor.resolver(''),{ciudad:null,ambiguas:false,coincidencias:[],total:0});
  assert.deepEqual(motor.buscar('no-existe-xyz987654'),[]);
});

test('la búsqueda limita 40 y ordena coincidencia exacta antes de prefijos y población',()=>{
  const filas=[[1,'Villa',0,0,0,0,10,''],[2,'Villa Grande',0,0,0,0,900000,''],[3,'La Villa',0,0,0,0,999999,'']];
  for(let i=0;i<50;i++)filas.push([10+i,'Villa '+i,0,0,0,0,100+i,'']);
  const pequeno=crear({regiones:['País'],zonas:['UTC'],filas});
  const r=pequeno.buscar('Villa');
  assert.equal(r.length,40);
  assert.equal(r[0].id,1,'exacta de poca población precede a prefijo grande');
  assert.equal(r[1].id,2);
  assert.equal(r[2].id,59,'prefijos se ordenan por población');
  assert.ok(!r.some(c=>c.id===3),'subcadena no desplaza coincidencias mejores');
  assert.equal(motor.buscar('san').length,40);
  assert.equal(motor.buscar('Tulum')[0].id,3515040);
  assert.equal(motor.buscar('Kolkata')[0].id,1275004);
});

test('la localidad elegida entrega sus coordenadas y zona IANA del catálogo mundial',()=>{
  for(const [consulta,id,tz] of [
    ['Kathmandu',1283240,'Asia/Kathmandu'],['Kolkata',1275004,'Asia/Kolkata'],
    ['Beijing',1816670,'Asia/Shanghai'],['Tulum',3515040,'America/Cancun'],
    ['Sao Paulo',3448439,'America/Sao_Paulo'],['London England',2643743,'Europe/London']
  ]){
    const c=motor.buscar(consulta).find(c=>c.id===id);
    assert.ok(c,`debe encontrar ${consulta}`);
    const elegida=motor.resolver(c.etiqueta).ciudad,f=porId.get(id);
    assert.equal(elegida.id,id);
    assert.equal(elegida.tz,tz);
    assert.equal(elegida.lat,f[3]);assert.equal(elegida.lon,f[4]);
  }
});

test('cercanasLinea entrega las doce menores distancias con identidad y zona correctas',()=>{
  const pequeno=crear({regiones:['País'],zonas:['UTC'],filas:Array.from({length:30},(_,i)=>[i+1,'Pueblo '+i,0,i,0,0,1,''])});
  let visitas=0;
  const geometry={distancia:(a,eje,lat,lon)=>{visitas++;assert.equal(eje,'MC');return{km:Math.abs(lat-20)*10,lon,lat};}};
  const r=pequeno.cercanasLinea({lonMC:0,dec:0},'MC',geometry);
  assert.equal(visitas,30);
  assert.equal(r.length,12);
  assert.equal(r[0].c.id,21);assert.equal(r[0].km,0);
  assert.ok(r.every((v,i)=>!i||v.km>=r[i-1].km));
  assert.ok(r.every(v=>v.c.tz==='UTC'));
  assert.throws(()=>pequeno.cercanasLinea({lonMC:0,dec:0},'INVALID',geometry),/inválida/);
});
