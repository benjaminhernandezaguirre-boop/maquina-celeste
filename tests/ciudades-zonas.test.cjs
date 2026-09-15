const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const fuente=fs.readFileSync(path.join(__dirname,'../app/efemerides.js'),'utf8');
function motor(){
  const contexto={window:{},Date,Intl};
  vm.runInNewContext(fuente,contexto,{filename:'app/efemerides.js'});
  return contexto;
}
const E=motor().window.Efem;
const iso=(...args)=>new Date(E.localAUTC(...args)).toISOString();

// Valores UTC fijados a partir de las reglas IANA, sin derivarlos de Intl.
// https://data.iana.org/time-zones/tzdb/asia (Kathmandu)
// https://data.iana.org/time-zones/tzdb/australasia (Chatham, Lord Howe, Apia)
// https://data.iana.org/time-zones/tzdb/europe (EU/Madrid y Paris)
// https://data.iana.org/time-zones/tzdb/northamerica (US/New York)
// Estas pruebas verifican también que el runtime tiene los datos necesarios.

test('zonas de cuarto y media hora conservan minutos y fecha UTC',()=>{
  const casos=[
    [[2024,1,1,0,0,'Asia/Kathmandu'],'2023-12-31T18:15:00.000Z'],
    [[2024,1,1,0,0,'Asia/Kolkata'],'2023-12-31T18:30:00.000Z'],
    [[2024,1,1,0,0,'Australia/Eucla'],'2023-12-31T15:15:00.000Z'],
    [[2024,1,1,0,0,'Pacific/Chatham'],'2023-12-31T10:15:00.000Z'],
    [[2024,7,1,0,0,'Pacific/Chatham'],'2024-06-30T11:15:00.000Z'],
    [[2024,1,1,0,0,'Pacific/Kiritimati'],'2023-12-31T10:00:00.000Z']
  ];
  for(const [entrada,esperado] of casos) assert.equal(iso(...entrada),esperado,entrada.join(' / '));
});

test('Nepal usa la regla de la fecha y detecta el salto de 15 minutos de 1986',()=>{
  assert.equal(iso(1985,12,31,23,59,'Asia/Kathmandu'),'1985-12-31T18:29:00.000Z');
  assert.equal(iso(1986,1,1,0,15,'Asia/Kathmandu'),'1985-12-31T18:30:00.000Z');
  for(const opcion of ['reject','earlier','later'])
    assert.throws(()=>E.localAUTC(1986,1,1,0,5,'Asia/Kathmandu',opcion),/no existió/);
  assert.equal(iso(2024,1,1,0,0,'Asia/Katmandu'),iso(2024,1,1,0,0,'Asia/Kathmandu'),'el alias IANA histórico sigue siendo compatible');
});

test('Chatham aplica DST además de los 45 minutos de su zona',()=>{
  assert.throws(()=>E.localAUTC(2024,9,29,3,0,'Pacific/Chatham'),/no existió/);
  assert.throws(()=>E.localAUTC(2024,4,7,3,0,'Pacific/Chatham'),/dos veces/);
  assert.equal(iso(2024,4,7,3,0,'Pacific/Chatham','earlier'),'2024-04-06T13:15:00.000Z');
  assert.equal(iso(2024,4,7,3,0,'Pacific/Chatham','later'),'2024-04-06T14:15:00.000Z');
});

test('Lord Howe distingue las dos ocurrencias separadas por media hora',()=>{
  assert.throws(()=>E.localAUTC(2024,4,7,1,45,'Australia/Lord_Howe'),/dos veces/);
  assert.equal(iso(2024,4,7,1,45,'Australia/Lord_Howe','earlier'),'2024-04-06T14:45:00.000Z');
  assert.equal(iso(2024,4,7,1,45,'Australia/Lord_Howe','later'),'2024-04-06T15:15:00.000Z');
  assert.throws(()=>E.localAUTC(2024,10,6,2,15,'Australia/Lord_Howe'),/no existió/);
});

test('Apia rechaza el día omitido al cruzar la línea de cambio de fecha en 2011',()=>{
  for(const [hora,min] of [[0,0],[12,0],[23,59]])
    for(const opcion of ['reject','earlier','later'])
      assert.throws(()=>E.localAUTC(2011,12,30,hora,min,'Pacific/Apia',opcion),/no existió/);
  assert.equal(iso(2011,12,29,12,0,'Pacific/Apia'),'2011-12-29T22:00:00.000Z');
  assert.equal(iso(2011,12,31,12,0,'Pacific/Apia'),'2011-12-30T22:00:00.000Z');
});

test('Madrid y Nueva York resuelven sus propias fechas de cambio estacional',()=>{
  const casos=[
    {zona:'Europe/Madrid',salto:[2024,3,31,2,30],doble:[2024,10,27,2,30],primera:'2024-10-27T00:30:00.000Z',segunda:'2024-10-27T01:30:00.000Z'},
    {zona:'America/New_York',salto:[2024,3,10,2,30],doble:[2024,11,3,1,30],primera:'2024-11-03T05:30:00.000Z',segunda:'2024-11-03T06:30:00.000Z'}
  ];
  for(const c of casos){
    assert.throws(()=>E.localAUTC(...c.salto,c.zona),/no existió/);
    assert.throws(()=>E.localAUTC(...c.doble,c.zona),/dos veces/);
    assert.equal(iso(...c.doble,c.zona,'earlier'),c.primera);
    assert.equal(iso(...c.doble,c.zona,'later'),c.segunda);
  }
});

test('la hora histórica conserva segundos aunque la entrada sea en minutos',()=>{
  assert.equal(iso(1850,6,1,12,0,'Europe/Paris'),'1850-06-01T11:50:39.000Z');
  assert.equal(E.desfaseZona('Europe/Paris',Date.parse('1850-06-01T11:50:39Z')),561000);
});

test('una zona desconocida se rechaza y no se reemplaza por UTC ni por la del dispositivo',()=>{
  const datos={anio:1990,mes:6,dia:15,hora:12,min:0,horaConocida:true,lat:27.7,lon:85.3,tz:'No/Such_Zone'};
  assert.throws(()=>E.localAUTC(1990,6,15,12,0,datos.tz));
  assert.throws(()=>E.validaCarta(datos));
  assert.equal(E.cartaValida(datos),false);
});

test('una carta guardada conserva coordenadas, zona y ocurrencia sin cargar ciudades',()=>{
  const ctx=motor(),efem=ctx.window.Efem;
  const guardada={anio:2024,mes:4,dia:7,hora:1,min:45,horaConocida:true,lat:-31.55,lon:159.08,tz:'Australia/Lord_Howe',desambiguacion:'later',lugarTexto:'Lord Howe Island, Australia',sistema:'signos'};
  const d=JSON.parse(JSON.stringify(guardada));
  assert.equal(ctx.window.Ciudades,undefined);
  assert.equal(efem.cartaValida(d),true);
  const calcula=()=>efem.localAUTC(d.anio,d.mes,d.dia,d.hora,d.min,d.tz,d.desambiguacion);
  const esperado=Date.parse('2024-04-06T15:15:00Z');
  assert.equal(calcula(),esperado);
  ctx.window.Ciudades={lista:[{etiqueta:d.lugarTexto,lat:0,lon:0,tz:'UTC'}]};
  assert.equal(calcula(),esperado,'cambiar el catálogo no sustituye los datos guardados');
  assert.deepEqual(d,guardada);
});
