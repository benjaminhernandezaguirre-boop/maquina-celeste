const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const textos=[];
const context={window:{},console,Date,Intl,document:{createElement:()=>({getContext:()=>new Proxy({measureText:s=>({width:String(s).length*12}),fillText:(s,x,y)=>textos.push({s,x,y})},{get:(t,k)=>t[k]||(()=>{})})})}};
vm.createContext(context);
for(const f of ['efemerides','escuelas','casas','dignidades','natal-lectura','natal-gobierno','natal-profesional','natal-estructura','natal-patrones','natal-relaciones','natal-luminarias','natal-estrellas','natal-puntos','natal-informe','natal-informe-ui'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/'+f+'.js'),'utf8'),context);
const {Efem:E,Escuelas:S,Casas:C,NatalLectura:L,NatalGobierno:G,NatalInforme:I,NatalInformeUI:UI}=context.window;
const r=Math.PI/180,mod=L.mod;
function carta(ms=Date.UTC(1990,2,21,12,30),lat=19.4326,lon=-99.1332){
 const T=E.sigTT(ms),eps=E.oblicuidad(T)+E.nutacion(T).deps,ramc=mod(E.horaSidereaGw(ms)+lon);
 const mc=C.lonDesdeAR(ramc,eps);let asc=mod(Math.atan2(Math.cos(ramc*r),-(Math.sin(ramc*r)*Math.cos(eps*r)+Math.tan(lat*r)*Math.sin(eps*r)))/r);if(mod(asc-mc)>180)asc=mod(asc+180);
 const ang={asc,mc,ramc,eps,lat,lon},cuerpos=S.DIEZ.map(id=>({id,nombre:S.NOMBRE_DE_ID[id],lon:E.lon(id,ms),glifo:'',color:'#667799'}));
 return {ms,jd:E.jdTT(ms),datos:{horaConocida:true,lat,lon,tz:'America/Mexico_City',factorOrbe:1,nombre:'Verificación',resumenFecha:'21 marzo 1990',lugarTexto:'Ciudad de México'},ang,cusp:C.cuspides('placidio',ang).c,cuerpos,puntos:[{id:'fortuna',nombre:'Fortuna',lon:0},{id:'nodoN',nombre:'Nodo Norte',lon:E.nodoNorte(T)}],aspectos:[]};
}
const cfg=(extra={})=>({perfil:'personalizada',poblacion:'siete',regencias:'tradicionales',zodiaco:'lahiri',casas:'signos',...extra});
test('sidereal government follows sidereal signs while preserving astronomical longitudes',()=>{
 const c=carta();c.ang.asc=255;const before=JSON.stringify(c),a=G.regenteAscendente(c,cfg());
 assert.equal(a.signoAscendente,'Escorpio');assert.equal(a.regente,'Marte');assert.equal(JSON.stringify(c),before);
 c.cuerpos.find(x=>x.id==='sol').lon=255;assert.equal(G.dispositores(c,cfg()).disponeA.sol,'marte');
});
test('changing houses and location at the same instant never returns previous cusps',()=>{
 const c=carta(),before=JSON.stringify(c),a=L.preparar(c,cfg()),b=L.preparar(c,cfg({casas:'igual'})),d=L.preparar(carta(c.ms,40,-3),cfg());
 assert.notEqual(a.cusp[1],b.cusp[1]);assert.notEqual(a.cusp[1],d.cusp[1]);assert.equal(JSON.stringify(c),before);
});
test('sect and Fortune stay invariant across all house systems and zodiac choices',()=>{
 const c=carta(),out=[];for(const casas of C.CUADRANTE.concat(['igual','signos','porfirio']))for(const zodiaco of ['trop','lahiri'])out.push(L.preparar(c,cfg({casas,zodiaco})));
 for(const x of out){assert.equal(x.diurna,out[0].diurna);assert.equal(x.puntos[0].lon,out[0].puntos[0].lon);}
 let reproduced=false;for(let min=0;min<120;min+=5){const x=L.preparar(carta(c.ms+min*60000),cfg({zodiaco:'trop'}));const sun=x.cuerpos.find(p=>p.id==='sol'),house=C.casaDe(sun.lon,x.cusp);if(x.diurna!==(house>=7&&house<=12))reproduced=true;}
 assert.ok(reproduced,'real sunrise cases differ from whole-sign house classification');
});
test('unknown birth time suppresses sect, houses, Fortune and almuten; sidereal signs still work',()=>{
 const c=carta();c.datos.horaConocida=false;c.ang=null;c.cusp=null;c.puntos=[];
 const a=I.crear(c,cfg());assert.equal(a.carta.diurna,null);assert.equal(a.carta.cusp,null);assert.ok(a.carta.ayanamsa>23);assert.ok(!JSON.stringify(a).includes('NaN'));
});
test('unknown time discards stale angles and Fortune from a previously timed chart',()=>{
 const c=carta();c.datos.horaConocida=false;const p=L.preparar(c,cfg());
 assert.equal(p.ang,null);assert.equal(p.cusp,null);assert.ok(!p.puntos.some(x=>x.id==='fortuna'));assert.equal(p.diurna,null);
});
test('Hellenistic report excludes almuten, accidental scoring and modern methods',()=>{
 const a=I.crear(carta(),{perfil:'helenistica'}),ids=a.secciones.map(x=>x.id);
 for(const id of ['almuten','accidentales','patrones','puntos-medios','declinaciones'])assert.ok(!ids.includes(id),id);
 assert.ok(ids.includes('secta'));assert.ok(ids.includes('esenciales'));assert.equal(a.carta.cuerpos.length,7);
 assert.ok(!a.secciones.find(x=>x.id==='esenciales').columnas.includes('Total'));
});
test('contemporary, medieval and Renaissance reports apply their own methods',()=>{
 const moderno=I.crear(carta(),{perfil:'contemporanea'}),med=I.crear(carta(),{perfil:'medieval'}),ren=I.crear(carta(),{perfil:'renacentista'});
 assert.equal(moderno.carta.cuerpos.length,10);assert.equal(moderno.carta.casasReal.sistema,'placidio');assert.ok(!moderno.secciones.some(x=>x.id==='esenciales'));
 assert.equal(med.carta.casasReal.sistema,'alcabitius');assert.ok(med.secciones.some(x=>x.id==='almuten'));assert.equal(med.secciones.find(x=>x.id==='accidentales').columnas.length,3);
 assert.equal(ren.carta.casasReal.sistema,'regiomontano');assert.equal(ren.secciones.find(x=>x.id==='accidentales').columnas.length,4);
});
test('complementary planets appear separately without entering balances or aspects',()=>{
 const a=I.crear(carta(),{perfil:'helenistica',complementaria:true});assert.ok(a.secciones.some(x=>x.id==='complementarios'));assert.equal(a.carta.cuerpos.length,7);
 assert.ok(!JSON.stringify(a.secciones.find(x=>x.id==='aspectos')).match(/Urano|Neptuno|Plutón/));
});
test('optional traditional techniques require explicit activation in contemporary profile',()=>{
 const a=I.crear(carta(),{perfil:'contemporanea',opcionales:{almutenFiguris:true,dignidadesEsenciales:true}});assert.ok(a.secciones.some(x=>x.id==='almuten'));assert.ok(a.secciones.some(x=>x.id==='esenciales'));assert.ok(!a.secciones.some(x=>x.id==='accidentales'));
});
test('PDF pagination keeps all rows and footers agree with actual page count',()=>{
 const a=I.crear(carta(),{perfil:'renacentista'}),plan=UI.plan(a);for(const p of plan){if(p.tipo==='tabla')for(const row of p.filas)assert.ok(row.y+row.alto<=2090);}
 for(const s of a.secciones)assert.equal(plan.filter(p=>p.seccion.id===s.id).flatMap(p=>p.filas).length,s.filas.length);
 textos.length=0;const pages=UI.lienzos(a,()=>{});assert.equal(pages.length,plan.length);
 for(let i=1;i<=pages.length;i++){assert.ok(textos.some(x=>x.s===`HOJA ${i} / ${pages.length}`));assert.ok(textos.some(x=>x.s===`${i} / ${pages.length}`));}
});
test('PDF wraps very long values without losing text or clipping rows',()=>{
 const a=I.crear(carta(),{perfil:'contemporanea'});a.secciones=[{id:'largo',titulo:'Texto largo',criterio:'Validación',columnas:['Dato','Texto'],filas:[['Nombre','palabra '.repeat(1500)]]}];
 const p=UI.plan(a);assert.ok(p.length>1);assert.equal(p.flatMap(x=>x.filas).flatMap(x=>x.celdas[1]).join(' ').match(/palabra/g).length,1500);
});
module.exports={carta,context};
