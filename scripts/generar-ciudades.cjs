/* Construye una instantánea estática mundial; no consulta servicios durante el uso.
   node scripts/generar-ciudades.cjs CARPETA_GEONAMES [FECHA] [ciudades-anterior.js]
   La carpeta contiene cities500.txt, admin1CodesASCII.txt y admin2Codes.txt.
   Fuente y licencia: https://download.geonames.org/export/dump/readme.txt */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto'),zlib=require('node:zlib');
const raiz=path.resolve(__dirname,'..'),dir=path.resolve(process.argv[2]||'.');
const fecha=process.argv[3]||new Date().toISOString().slice(0,10);
const normal=t=>String(t||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function lee(nombre){return fs.readFileSync(path.join(dir,nombre),'utf8');}
function admin(nombre){return new Map(lee(nombre).trim().split(/\r?\n/).map(l=>{const p=l.split('\t');return[p[0],p[1]];}));}
const a1=admin('admin1CodesASCII.txt'),a2=admin('admin2Codes.txt');
const pais=new Intl.DisplayNames(['es'],{type:'region'}),zonasValidadas=new Set();
const texto=lee('cities500.txt'),ids=new Set();
const registros=texto.trim().split(/\r?\n/).map(l=>{
  const p=l.split('\t'),id=Number(p[0]),lat=Number(p[4]),lon=Number(p[5]),tz=p[17];
  if(p.length<19||!Number.isInteger(id)||ids.has(id)||!p[1]||!p[8]||!tz||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Registro inválido: '+p[0]);
  ids.add(id);
  if(!zonasValidadas.has(tz)){new Intl.DateTimeFormat('es',{timeZone:tz});zonasValidadas.add(tz);}
  const cc=p[8],region=a1.get(cc+'.'+p[10])||'',sub=a2.get(cc+'.'+p[10]+'.'+p[11])||'';
  return{id,n:p[1],ascii:p[2],lat,lon,tz,pop:Number(p[14])||0,cc,sub,r:[region,`${pais.of(cc)||cc} (${cc})`].filter(Boolean).join(', '),alias:p[3]};
});
// No descartar localidades homónimas dentro del mismo estado.
function grupos(){const g=new Map();for(const c of registros){const k=normal(c.n+', '+c.r);if(!g.has(k))g.set(k,[]);g.get(k).push(c);}return g;}
for(const grupo of grupos().values())if(grupo.length>1)for(const c of grupo)if(c.sub)c.r=c.sub+', '+c.r;
for(const grupo of grupos().values())if(grupo.length>1)for(const c of grupo)c.r+=' · GeoNames '+c.id;
const compatRuta=path.join(__dirname,'ciudades-compat.json');
let compat={etiquetas:[],extras:[]};
if(process.argv[4]){
  const ctx={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[4],'utf8'),ctx);
  const previas=ctx.window.Ciudades.lista,porNombre=new Map();
  const buscados=new Set(previas.map(c=>normal(c.n)));
  for(const c of registros)for(const n of new Set([c.n,c.ascii,...c.alias.split(',')].map(normal)))if(buscados.has(n)){if(!porNombre.has(n))porNombre.set(n,[]);porNombre.get(n).push(c);}
  previas.forEach((c,i)=>{
    const candidatas=(porNombre.get(normal(c.n))||[]).map(x=>({x,d:Math.hypot((x.lat-c.lat), (x.lon-c.lon)*Math.cos(c.lat*Math.PI/180))})).filter(x=>x.d<0.2).sort((a,b)=>a.d-b.d);
    // Sólo coincidencia única o claramente más cercana; no adivinar entre vecinos.
    if(candidatas.length===1||(candidatas.length>1&&candidatas[0].d<0.02&&candidatas[1].d>candidatas[0].d*4))compat.etiquetas.push([c.etiqueta,candidatas[0].x.id,c.n]);
    else compat.extras.push({id:-(i+1),n:c.n,r:c.r,lat:c.lat,lon:c.lon,tz:c.tz,pop:0,ascii:'',cc:''});
  });
  fs.writeFileSync(compatRuta,JSON.stringify(compat,null,2)+'\n');
}else if(fs.existsSync(compatRuta))compat=JSON.parse(fs.readFileSync(compatRuta,'utf8'));
for(const c of compat.extras)registros.push(c);
// Un alias no puede sobrevivir apuntando a un registro retirado sin avisar.
for(const [label,id] of compat.etiquetas)if(!ids.has(id))throw Error('Revisar alias retirado: '+label+' #'+id);
const regiones=[],zonas=[],ir=new Map(),iz=new Map();
function indice(m,a,v){if(!m.has(v)){m.set(v,a.length);a.push(v);}return m.get(v);}
const filas=registros.map(c=>[c.id,c.n,indice(ir,regiones,c.r),c.lat,c.lon,indice(iz,zonas,c.tz),c.pop,normal(c.ascii)!==normal(c.n)?c.ascii:'']);
const datos={version:fecha,fuente:'GeoNames cities500',licencia:'CC BY 4.0',regiones,zonas,filas,aliases:compat.etiquetas};
const contenido=JSON.stringify(datos)+'\n';
const archivo='ciudades-'+fecha+'.json';
fs.mkdirSync(path.join(raiz,'app/datos'),{recursive:true});
fs.writeFileSync(path.join(raiz,'app/datos',archivo),contenido);
const manifest={version:fecha,archivo,fuente:datos.fuente,licencia:datos.licencia,url:'https://download.geonames.org/export/dump/',geonames:ids.size,compatibilidad:compat.extras.length,total:filas.length,paises:new Set(registros.map(c=>c.cc).filter(Boolean)).size,zonas:zonas.length,bytes:Buffer.byteLength(contenido),gzipBytes:zlib.gzipSync(contenido,{level:9}).length,sha256:crypto.createHash('sha256').update(contenido).digest('hex'),origenSHA256:crypto.createHash('sha256').update(texto).digest('hex')};
fs.writeFileSync(path.join(raiz,'app/datos/ciudades-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(manifest,null,2));
