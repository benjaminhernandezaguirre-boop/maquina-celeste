const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Capas=require('../app/natal-capas.js');
const html=fs.readFileSync(path.join(__dirname,'../astroplanetario.html'),'utf8');
const mod=x=>((x%360)+360)%360;
const plain=x=>JSON.parse(JSON.stringify(x));
const ids=['sol','luna','mercurio','venus','marte','jupiter','saturno','urano','neptuno','pluton'];
const fuera=ids.slice(7);

function entre(inicio,fin){
  const a=html.indexOf(inicio),b=html.indexOf(fin,a+inicio.length);
  assert.ok(a>=0&&b>a,`Se encuentra la función de producción: ${inicio}`);
  return html.slice(a,b);
}
function desigual(){
  return {datos:{horaConocida:true,sistema:'placidio',sistemaReal:'porfirio'},
    cusp:[null,350,15,43,82,112,144,170,195,223,262,292,324],
    ang:{asc:353,mc:266,ramc:265,lat:19.4},aviso:'Sustitución declarada'};
}
function anchos(cusp){return Array.from({length:12},(_,i)=>mod(cusp[i===11?1:i+2]-cusp[i+1]));}
function capaDiez(){
  const contacto=(p,n)=>({P:{id:p,lon:12},N:{id:n,lon:12},asp:{a:0,mayor:true}});
  return {movidos:ids.map((id,i)=>({id,lon:i*30})),casas:Capas.casasDe(desigual()),
    cerca:[contacto('sol','luna'),contacto('urano','sol'),contacto('sol','neptuno'),contacto('pluton','urano')]};
}

test('casas dirigidas: arcos cero y vueltas completas conservan cúspides, ángulos y procedencia sin mutar',()=>{
  const natal=desigual(),antes=plain(natal);
  for(const arco of [0,360,-360,720]){
    const c=Capas.casasDe(natal,arco);
    assert.deepEqual(c.cusp,natal.cusp);
    assert.equal(c.ang.asc,natal.ang.asc);assert.equal(c.ang.mc,natal.ang.mc);
    assert.equal(c.sistema,'porfirio');assert.equal(c.aviso,natal.aviso);
    assert.notEqual(c.cusp,natal.cusp);assert.notEqual(c.ang,natal.ang);
    c.cusp[1]=99;c.ang.asc=99;
    assert.deepEqual(natal,antes);
  }
});
test('arcos negativos y mayores de una vuelta atraviesan Aries y conservan las doce anchuras',()=>{
  const natal=desigual(),antes=plain(natal);
  for(const arco of [-37.5,25.5,749.25]){
    const c=Capas.casasDe(natal,arco);
    assert.deepEqual(anchos(c.cusp),anchos(natal.cusp));
    for(let i=1;i<=12;i++)assert.equal(c.cusp[i],mod(natal.cusp[i]+arco));
    assert.equal(c.ang.asc,mod(353+arco));assert.equal(c.ang.mc,mod(266+arco));
  }
  assert.deepEqual(natal,antes);
});
test('sin carta, sin hora o sin geometría no se fabrican casas exteriores',()=>{
  for(const c of [null,undefined,{...desigual(),ang:null},{...desigual(),cusp:null},
    {...desigual(),datos:{horaConocida:false}}])assert.equal(Capas.casasDe(c,25),null);
});
test('escuela de siete cuerpos excluye transaturninos y aspectos por cualquiera de sus extremos',()=>{
  const capa=capaDiez(),antes=plain(capa),f=Capas.filtrar(capa,{fuera,complementaria:false});
  assert.deepEqual(f.movidos.map(p=>p.id),ids.slice(0,7));
  assert.deepEqual(f.cerca.map(c=>[c.P.id,c.N.id]),[['sol','luna']]);
  assert.ok(f.movidos.every(p=>p.complementario===false));
  assert.deepEqual(capa,antes);assert.equal(f.casas,capa.casas);
});
test('complementarios recuperan diez cuerpos marcados pero no reintroducen sus aspectos',()=>{
  const capa=capaDiez(),antes=plain(capa),f=Capas.filtrar(capa,{fuera,complementaria:true});
  assert.deepEqual(f.movidos.map(p=>p.id),ids);
  assert.deepEqual(f.movidos.filter(p=>p.complementario).map(p=>p.id),fuera);
  assert.deepEqual(f.cerca.map(c=>[c.P.id,c.N.id]),[['sol','luna']]);
  assert.deepEqual(capa,antes);
});
test('escuela de diez cuerpos conserva todos sus aspectos y tolera la ausencia de capa',()=>{
  const capa=capaDiez(),f=Capas.filtrar(capa,{fuera:[],complementaria:false});
  assert.equal(f.movidos.length,10);assert.deepEqual(f.cerca,capa.cerca);
  assert.ok(f.movidos.every(p=>!p.complementario));
  assert.equal(Capas.filtrar(null,{fuera}),null);assert.equal(Capas.filtrar(capa,null),capa);
});

// Se ejecutan las funciones del HTML con efemérides, escuelas y casas reales.
// Solo se sustituyen almacenamiento/UI y la búsqueda del instante del retorno,
// que no intervienen en los contratos de caché y geometría comprobados aquí.
function entorno(){
  const c={window:{},console,Date,Intl,config:{perfil:'contemporanea'},guardadas:[],
    estadoSin:{idB:null,factorOrbe:1,error:null},estadoProg:{modo:'secundarias',fecha:Date.UTC(2026,8,15,12)},
    estadoAtacir:{clave:'libre',diasLibres:365.2,fecha:Date.UTC(2026,8,15,12)},
    estadoRS:{anio:2026},estadoTransitos:{fecha:null,orbe:2},
    sinastriaActivo:false,compuestaActiva:false,atacirActivo:false,transitosActivo:false,
    revolucionActivo:false,progresActivo:false};
  vm.createContext(c);
  for(const f of ['efemerides','escuelas','casas','natal-lectura','natal-capas'])
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/'+f+'.js'),'utf8'),c);
  Object.assign(c,c.window.Efem);
  c.ORDEN_EFEM=ids;
  c.porId=Object.fromEntries(ids.map(id=>[id,{nombre:id,glifo:id,color:'#888888'}]));
  c.lecturaResuelta=()=>c.window.Escuelas.resuelve(c.config);
  c.leerCartas=()=>c.guardadas;
  c.fechaProg=()=>c.estadoProg.fecha;
  c.anioRS=()=>c.estadoRS.anio;
  c.lugarRS=()=>({lat:40.4,lon:-3.7,tz:'Europe/Madrid',texto:'Madrid'});
  c.instanteRevolucion=()=>Date.UTC(2026,2,21,10);
  c.claveActual=()=>({id:c.estadoAtacir.clave,dias:c.estadoAtacir.diasLibres});
  const partes=[
    entre('const PUNTOS = {','function oblicuidad('),
    entre('function angulos(','function placidio('),
    entre('const ASPECTOS = [','const gradoMin ='),
    entre('function cartaDeInstante(','/* --- dibujo de la carta:'),
    entre('const huellaCarta =','function nuevaId('),
    entre('function puntosMoviles(','/* arco solar real:'),
    entre('let _rsFirma = null','function capaRevolucion('),
    entre('function instanteProgresado(','/* cuándo cambia de signo un astro progresado'),
    entre('const cacheB = {};','function pintaSinastria('),
    entre('function firmaCapa(){','function construyeCapa(')
  ];
  vm.runInContext(partes.join('\n'),c);
  c.datos={nombre:'A',anio:1990,mes:3,dia:21,hora:12,min:30,horaConocida:true,
    lat:19.4326,lon:-99.1332,tz:'UTC',lugarTexto:'Ciudad de México',sistema:'placidio',factorOrbe:1};
  c.carta=c.cartaDeInstante(Date.UTC(1990,2,21,12,30),{...c.datos});
  const construir=c.cartaDeInstante;
  c.construcciones=[];
  c.cartaDeInstante=(ms,d)=>{c.construcciones.push({ms,datos:plain(d)});return construir(ms,d);};
  c.levantarCarta=(d,asignar)=>{
    assert.equal(asignar,false,'B se calcula sin sustituir la natal A');
    return c.cartaDeInstante(c.window.Efem.localAUTC(d.anio,d.mes,d.dia,d.hora,d.min,d.tz),{...d});
  };
  return c;
}
function verificaCasas(c,ch,sistema){
  const aya=c.window.NatalLectura.ayanamsa(ch,c.lecturaResuelta());
  const esperado=c.window.Casas.cuspides(sistema,ch.ang,{ayanamsa:aya});
  assert.deepEqual(plain(ch.cusp),plain(esperado.c));
  assert.equal(ch.datos.sistemaReal,esperado.sistema);
}
test('caché de B se reutiliza y reconstruye sus casas al cambiar escuela o datos guardados',()=>{
  const c=entorno();c.guardadas=[{id:'B',datos:{...c.datos,nombre:'B',hora:5,lat:48.85,lon:2.35}}];
  const a=c.cartaDeGuardada('B');assert.equal(c.cartaDeGuardada('B'),a);assert.equal(c.construcciones.length,1);
  c.config={perfil:'helenistica'};
  const b=c.cartaDeGuardada('B');assert.notEqual(b,a);verificaCasas(c,b,'signos');
  assert.notDeepEqual(plain(a.cusp),plain(b.cusp));assert.equal(c.construcciones.length,2);
  assert.equal(c.cartaDeGuardada('B'),b);
  c.guardadas[0].datos.hora=8;
  const d=c.cartaDeGuardada('B');assert.notEqual(d,b);assert.notEqual(d.ang.asc,b.ang.asc);
  c.guardadas=[];assert.equal(c.cartaDeGuardada('B'),null,'eliminar B no revive su caché anterior');
});
test('sinastría sin B no dibuja capa; B sin hora conserva planetas sin casas ni ángulos',()=>{
  const c=entorno();assert.equal(c.capaSinastria(),null);
  c.estadoSin.idB='ausente';assert.equal(c.capaSinastria(),null);
  c.guardadas=[{id:'B',datos:{...c.datos,nombre:'B',horaConocida:false}}];c.estadoSin.idB='B';
  const capa=c.capaSinastria();assert.equal(capa.casas,null);
  assert.equal(capa.movidos.filter(p=>ids.includes(p.id)).length,10);
  assert.ok(!capa.movidos.some(p=>['asc','mc','fortuna'].includes(p.id)));
  assert.ok(c.carta.ang&&c.carta.cusp,'A conserva sus propias casas');
});
test('revolución reutiliza caché y recalcula casas para la nueva escuela con su propio lugar',()=>{
  const c=entorno(),a=c.laRevolucion();assert.equal(c.laRevolucion(),a);assert.equal(c.construcciones.length,1);
  c.config={perfil:'renacentista'};
  const b=c.laRevolucion();assert.notEqual(b,a);assert.equal(c.construcciones.length,2);
  verificaCasas(c,b,'regiomontano');assert.notDeepEqual(plain(a.cusp),plain(b.cusp));
  assert.equal(b.ang.lat,40.4);assert.equal(b.ang.lon,-3.7);assert.equal(b.ms,a.ms);
  c.carta.datos.horaConocida=false;assert.equal(c.laRevolucion(),null);
});
test('secundarias invalidan caché por escuela y usan casas activas con ayanamsa de la progresada',()=>{
  const c=entorno(),antes=plain(c.carta),a=c.laProgresion();
  assert.equal(c.laProgresion(),a);assert.equal(c.construcciones.length,1);
  c.config={perfil:'personalizada',casas:'signos',zodiaco:'lahiri',poblacion:'siete'};
  const p=c.laProgresion();assert.notEqual(p,a);assert.equal(c.construcciones.length,2);
  verificaCasas(c,p,'signos');assert.notDeepEqual(plain(a.cusp),plain(p.cusp));
  const ayaP=c.window.NatalLectura.ayanamsa(p,c.lecturaResuelta());
  const ayaNatal=c.window.NatalLectura.ayanamsa(c.carta,c.lecturaResuelta());
  assert.ok(Math.abs(ayaP-ayaNatal)>1e-5,'las dos fechas permiten detectar el desfase natal incorrecto');
  assert.ok(Math.abs(mod(p.cusp[1]-ayaP)/30-Math.round(mod(p.cusp[1]-ayaP)/30))<1e-10);
  assert.notDeepEqual(plain(p.cusp),plain(c.window.Casas.cuspides('signos',p.ang,{ayanamsa:ayaNatal}).c));
  assert.equal(p.ang.mc,mod(c.carta.ang.mc+p.arcoAngulos));
  assert.deepEqual(plain(c.carta),antes,'recalcular progresiones no altera la natal');
  assert.equal(c.laProgresion(),p);
  c.estadoProg.fecha+=86400000;assert.notEqual(c.laProgresion(),p);
});
test('capa de progresiones bloquea secundarias y arco solar cuando falta la hora natal',()=>{
  const c=entorno();c.carta.datos.horaConocida=false;
  for(const modo of ['secundarias','arco']){
    c.estadoProg.modo=modo;assert.equal(c.capaProgres(),null);
  }
  assert.equal(c.construcciones.length,0);
});
test('firma exterior distingue claves libres con diferente velocidad y cambios de escuela',()=>{
  const c=entorno();c.atacirActivo=true;
  const a=c.firmaCapa();assert.equal(c.firmaCapa(),a);
  c.estadoAtacir.diasLibres=121.75;const b=c.firmaCapa();assert.notEqual(b,a);
  c.config={perfil:'helenistica'};assert.notEqual(c.firmaCapa(),b);
  c.estadoAtacir.fecha=0;const cero=c.firmaCapa();
  c.estadoAtacir.fecha=null;assert.notEqual(c.firmaCapa(),cero,'fecha 0 es un instante explícito');
});
