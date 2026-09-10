const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const context={window:{},Date,Intl};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'app/efemerides.js'),'utf8'),context);
const E=context.window.Efem, G=require('../app/astrocartografia.js');
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b} (tol ${t})`);
const wrap=x=>((x+180)%360+360)%360-180;
test('ΔT follows NASA 1800–1860 polynomial, including branch boundaries',()=>{
  near(E.deltaT(Date.UTC(1800,0,1)),13.706160249770136);
  near(E.deltaT(Date.UTC(1860,0,1)),7.643468308163189);
  for(const y of [1800,1820,1850,1860,1900,1986,2005,2050]) assert.ok(Math.abs(E.deltaT(Date.UTC(y,0,1)))<100);
});
test('civil time round-trips ordinary, gap, fold, half-hour DST and historical offsets',()=>{
  assert.equal(new Date(E.localAUTC(1990,3,21,6,30,'America/Mexico_City')).toISOString(),'1990-03-21T12:30:00.000Z');
  assert.throws(()=>E.localAUTC(2024,3,10,2,30,'America/New_York'),/no existió/);
  assert.throws(()=>E.localAUTC(2024,11,3,1,30,'America/New_York'),/dos veces/);
  assert.equal(E.localAUTC(2024,11,3,1,30,'America/New_York','later')-E.localAUTC(2024,11,3,1,30,'America/New_York','earlier'),3600000);
  assert.equal(E.localAUTC(2024,4,7,1,45,'Australia/Lord_Howe','later')-E.localAUTC(2024,4,7,1,45,'Australia/Lord_Howe','earlier'),1800000);
  for(const a of [[1850,6,1,12,0,'Europe/Paris'],[2024,1,1,0,0,'Asia/Kathmandu'],[2000,2,29,23,59,'UTC']]){
    const ms=E.localAUTC(...a); assert.equal(ms+E.desfaseZona(a[5],ms),E.utcMs(...a.slice(0,5)));
  }
  assert.throws(()=>E.localAUTC(2023,2,29,12,0,'UTC'),/válida/);
  assert.throws(()=>E.localAUTC(2024,1,1,12,0,'No/Such_Zone'));
});
test('3D frame rotation preserves norms and inverse recovers J2000',()=>{
  for(const T of [-2,-1,0,0.26,0.5]) for(const v of [{x:1,y:0,z:0},{x:0,y:0,z:1},{x:.2,y:-.8,z:.4}]){
    const q=E.marcoEcliptico(v,T),b=E.marcoEcliptico(q,T,true);
    for(const k of ['x','y','z'])near(b[k],v[k],1e-12);
    near(Math.hypot(q.x,q.y,q.z),Math.hypot(v.x,v.y,v.z),1e-12);
  }
});
test('precession matches independent ERFA pmat76 published matrix',()=>{
  // https://github.com/liberfa/erfa/blob/master/src/t_erfa_c.c (t_pmat76)
  const T=(2400000.5+50123.9999-2451545)/36525;
  const expected=[[.9999995504328350733,.0008696632209480961,.00037791534749598883],[-.0008696632209485112,.9999996218428560614,-.00000016432847761118864],[-.0003779153474950335,-.0000001643306746147367,.999999928589979]];
  const rx=(v,a)=>({x:v.x,y:Math.cos(a)*v.y-Math.sin(a)*v.z,z:Math.sin(a)*v.y+Math.cos(a)*v.z});
  for(let k=0;k<3;k++){
    const eq={x:k===0?1:0,y:k===1?1:0,z:k===2?1:0};
    const q=rx(E.marcoEcliptico(rx(eq,-E.oblicuidad(0)*E.RAD),T),E.oblicuidad(T)*E.RAD);
    ['x','y','z'].forEach((v,i)=>near(q[v],expected[i][k],1e-12));
  }
});
test('50 frozen JPL Horizons cases remain within documented approximate-model budgets',()=>{
  const fixtures=require('./fixtures/horizons.json').fixtures;
  // Arcminutes, deliberately not an all-date precision guarantee.
  const limits={sol:.1,luna:2,mercurio:1,venus:1,marte:2,jupiter:8,saturno:15,urano:3,neptuno:2,pluton:2};
  assert.equal(fixtures.length,50);
  for(const a of fixtures){
    const T=E.sigTT(Date.parse(a.date)),p=E.posGeo(a.id,T),q=E.ecuatorial(p.lon,p.lat,T);
    const h=Math.sin((q.dec-a.dec)*E.RAD/2)**2+Math.cos(q.dec*E.RAD)*Math.cos(a.dec*E.RAD)*Math.sin(wrap(q.ar-a.ra)*E.RAD/2)**2;
    const arcmin=2*Math.asin(Math.sqrt(h))*E.DEG*60;
    assert.ok(arcmin<limits[a.id],a.id+' '+a.date+': '+arcmin+' arcmin');
  }
});
test('Earth correction points away from the Moon and includes latitude',()=>{
  const T=.26,b=E.helio('tierra',T),e=E.centroTierra(T);
  const correction=E.marcoEcliptico({x:e.x-b.x,y:e.y-b.y,z:e.z-b.z},T);
  const l=E.lunaLon(T)*E.RAD, beta=E.lunaLat(T)*E.RAD;
  const dot=correction.x*Math.cos(beta)*Math.cos(l)+correction.y*Math.cos(beta)*Math.sin(l)+correction.z*Math.sin(beta);
  assert.ok(dot<0); assert.ok(Math.abs(correction.z)>1e-9);
  near(Math.atan2(correction.z,Math.hypot(correction.x,correction.y))*E.DEG,-E.lunaLat(T),1e-7);
});
test('all planets produce finite date-frame coordinates and longitude API agrees',()=>{
  for(const date of ['1800-01-01','1900-06-01','1990-03-21','2026-09-10','2050-12-31']){
    const T=E.sigTT(Date.parse(date+'T12:00:00Z'));
    for(const id of E.ORDEN){const p=E.posGeo(id,T),q=E.ecuatorial(p.lon,p.lat,T);
      assert.ok([p.lon,p.lat,q.ar,q.dec].every(Number.isFinite));near(p.lon,E.lonGeo(id,T));assert.ok(Math.abs(q.dec)<90);
    }
    near(E.posGeo('sol',T).lat,0);
  }
});
test('AC/DC have zero altitude with correct rising/setting branch; MC/IC oppose',()=>{
  for(const dec of [-80,-30,0,23.44,80])for(let lat=-89;lat<90;lat++){
    const a={lonMC:123,dec};
    for(const eje of ['AC','DC']){const lon=G.longitud(a,eje,lat);if(lon===null)continue;
      const h=wrap(lon-a.lonMC)*E.RAD;
      near(Math.sin(lat*E.RAD)*Math.sin(dec*E.RAD)+Math.cos(lat*E.RAD)*Math.cos(dec*E.RAD)*Math.cos(h),0,1e-12);
      assert.ok(eje==='AC'?Math.sin(h)<=1e-12:Math.sin(h)>=-1e-12);
    }
    near(Math.abs(wrap(G.longitud(a,'MC',lat)-G.longitud(a,'IC',lat))),180);
  }
});
test('distance is spherical and branch-aware, including beyond circumpolar endpoints',()=>{
  near(G.distancia({lonMC:0,dec:30},'AC',60.1,180).km,G.RADIO_KM*Math.PI/180*.1,1e-7);
  near(G.distancia({lonMC:0,dec:0},'MC',60,5).km,G.RADIO_KM*Math.asin(Math.cos(Math.PI/3)*Math.sin(5*E.RAD)),1e-7);
  near(G.distancia({lonMC:0,dec:0},'MC',0,180).grados,90);
  near(G.distancia({lonMC:0,dec:0},'IC',0,180).grados,0);
  near(G.distancia({lonMC:179,dec:0},'MC',0,-179).grados,2);
  near(G.distancia({lonMC:0,dec:0},'DC',0,90).grados,0);
  near(G.distancia({lonMC:0,dec:0},'AC',0,90).grados,90);
});
test('curves include exact polar endpoints and both antimeridian borders',()=>{
  for(const dec of [-60,-23.44,0,23.44,60])for(const lonMC of [-179,0,179])for(const eje of ['AC','DC','MC','IC']){
    const a={dec,lonMC},segments=G.curva(a,eje);
    for(const seg of segments)for(let i=0;i<seg.length;i++){
      const [lon,lat]=seg[i];assert.ok(Number.isFinite(lon)&&Number.isFinite(lat));
      if(i)assert.ok(Math.abs(lon-seg[i-1][0])<=180+1e-8);
      assert.ok(G.distancia(a,eje,lat,lon).km<.001);
    }
    for(let i=1;i<segments.length;i++){
      const prev=segments[i-1].at(-1),next=segments[i][0];near(Math.abs(prev[0]),180);near(prev[0],-next[0]);near(prev[1],next[1]);
    }
    near(Math.abs(segments[0][0][1]),eje==='AC'||eje==='DC'?90-Math.abs(dec):90,1e-8);
  }
});
test('import schema rejects invalid dates, coordinates, timezones and unsafe value types',()=>{
  const d={anio:1990,mes:3,dia:21,hora:6,min:30,horaConocida:true,lat:19.4,lon:-99.1,tz:'America/Mexico_City'};
  assert.ok(E.cartaValida(d));
  for(const p of [{anio:1799},{anio:2051},{mes:2,dia:30},{lat:91},{lon:181},{lat:'19.4'},{tz:'bad-zone'},{horaConocida:1},{nombre:{}},{sistema:'bad'}])assert.equal(E.cartaValida({...d,...p}),false);
  assert.equal(E.escaparHTML('<img src=x onerror="bad">'), '&lt;img src=x onerror=&quot;bad&quot;&gt;');
});
test('both HTML entrypoints parse and natal uses shared engine',()=>{
  for(const file of ['astrocarto.html','astroplanetario.html']){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
    assert.ok(html.includes('<script src="app/efemerides.js"></script>'));
  }
  const natal=fs.readFileSync(path.join(root,'astroplanetario.html'),'utf8');
  assert.ok(!natal.includes('function deltaT(')); assert.ok(!natal.includes('function localAUTC('));
});
