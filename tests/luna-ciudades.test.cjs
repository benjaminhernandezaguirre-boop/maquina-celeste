const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'luna.html'),'utf8');

function interfaz({guardada=null,resolverAsync=async()=>({ciudad:null})}={}){
  const c={window:{Ciudades:{resolverAsync}},Date,Intl,Number,
    localStorage:{getItem:()=>JSON.stringify(guardada)},
    birthDate:{value:'2024-01-01'},birthTime:{value:'00:00'},birthCity:{value:'Kathmandu'},
    returnCity:{value:''},progBirthDate:{value:'2024-01-01'},progBirthTime:{value:'00:00'},progBirthCity:{value:'Kathmandu'},
    julian:ms=>ms,siglos:n=>n,lonGeo:()=>0};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root,'app/efemerides.js'),'utf8'),c);
  vm.runInContext(html.slice(html.indexOf('async function cityFind('),html.indexOf('const ASPECT_NAMES')),c);
  vm.runInContext(html.slice(html.indexOf('async function progressedBirthFromInputs('),html.indexOf('function useSavedProgressedBirth(')),c);
  return c;
}

test('Luna espera la localidad antes de convertir la hora de cuarto de hora',async()=>{
  let resolver,terminado=false;
  const c=interfaz({resolverAsync:()=>new Promise(r=>resolver=r)});
  const pendiente=c.birthFromInputs().then(r=>{terminado=true;return r;});
  await Promise.resolve();
  assert.equal(terminado,false);
  resolver({ciudad:{lat:27.7,lon:85.32,tz:'Asia/Kathmandu',etiqueta:'Kathmandu, Bagmati, NP'}});
  const nacimiento=await pendiente;
  assert.equal(new Date(nacimiento.ms).toISOString(),'2023-12-31T18:15:00.000Z');
});

test('Luna rechaza homónimos y propaga un fallo de descarga',async()=>{
  const c=interfaz({resolverAsync:async()=>({ciudad:null,ambiguas:true})});
  await assert.rejects(c.birthFromInputs(),/varias localidades/);
  c.window.Ciudades.resolverAsync=async()=>{throw new Error('Catálogo sin conexión');};
  await assert.rejects(c.progressedBirthFromInputs(),/sin conexión/);
});

test('Luna usa las coordenadas y ocurrencia guardadas sin descargar ciudades',async()=>{
  const d={anio:2024,mes:11,dia:3,hora:1,min:30,horaConocida:true,lat:40.8,lon:-73.8,tz:'America/New_York',lugarTexto:'Lugar natal personalizado',desambiguacion:'later'};
  let peticiones=0;
  const c=interfaz({guardada:d,resolverAsync:async()=>{peticiones++;throw Error('No debería cargar');}});
  c.useSavedBirth();
  const b=await c.birthFromInputs();
  assert.equal(peticiones,0);
  assert.equal(b.city.lat,40.8);
  assert.equal(new Date(b.ms).toISOString(),'2024-11-03T06:30:00.000Z');
  c.progBirthDate.value=c.birthDate.value;c.progBirthTime.value=c.birthTime.value;c.progBirthCity.value=c.birthCity.value;
  assert.equal((await c.progressedBirthFromInputs()).ms,b.ms);
});

test('Luna rechaza horas locales inexistentes y repetidas sin decisión guardada',async()=>{
  const c=interfaz({resolverAsync:async()=>({ciudad:{lat:40.7,lon:-74,tz:'America/New_York',etiqueta:'New York'}})});
  c.birthDate.value='2024-03-10';c.birthTime.value='02:30';
  await assert.rejects(c.birthFromInputs(),/no existió/);
  c.birthDate.value='2024-11-03';c.birthTime.value='01:30';
  await assert.rejects(c.birthFromInputs(),/dos veces/);
});

test('Luna conserva medianoche y exige hora conocida para un retorno',async()=>{
  const c=interfaz();
  const d={anio:2024,mes:1,dia:1,hora:0,min:0,horaConocida:true,tz:'Asia/Kathmandu'};
  assert.equal(new Date(c.natalPositions(d).ms).toISOString(),'2023-12-31T18:15:00.000Z');
  assert.equal(c.natalPositions({...d,horaConocida:false}),null);
  c.birthTime.value='';
  assert.equal(await c.birthFromInputs(),null);
});
