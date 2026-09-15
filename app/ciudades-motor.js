/* Índice mundial. Se ejecuta dentro del Worker; nunca manda el catálogo completo
   a la interfaz. También exporta CommonJS para verificar los datos reales. */
(function(root){
'use strict';
const normaliza=t=>String(t||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function crear(datos){
  if(!datos||!Array.isArray(datos.filas)||!Array.isArray(datos.regiones)||!Array.isArray(datos.zonas))throw Error('Catálogo de ciudades inválido.');
  const filas=datos.filas,regiones=datos.regiones,zonas=datos.zonas;
  const nombres=filas.map(f=>normaliza(f[1])),ascii=filas.map(f=>normaliza(f[7]));
  const regionesNorm=regiones.map(normaliza),aliasEtiquetas=new Map(),aliasNombres=new Map();
  const porId=new Map(filas.map((f,i)=>[f[0],i]));
  for(const [etiqueta,id,nombre] of datos.aliases||[]){
    const i=porId.get(id);if(i===undefined)continue;
    aliasEtiquetas.set(normaliza(etiqueta),i);
    const k=normaliza(nombre);if(k!==nombres[i]&&k!==ascii[i]){if(!aliasNombres.has(i))aliasNombres.set(i,[]);aliasNombres.get(i).push(k);}
  }
  porId.clear();
  function ciudad(i){const f=filas[i];return{id:f[0],n:f[1],r:regiones[f[2]],lat:f[3],lon:f[4],tz:zonas[f[5]],etiqueta:f[1]+', '+regiones[f[2]]};}
  function resultado(indices,total=indices.length){return{ciudad:total===1?ciudad(indices[0]):null,ambiguas:total>1,coincidencias:indices.slice(0,40).map(ciudad),total};}
  function resolver(texto){
    const k=normaliza(texto);if(!k)return resultado([]);
    if(aliasEtiquetas.has(k))return resultado([aliasEtiquetas.get(k)]);
    const indices=[];let total=0;
    for(let i=0;i<filas.length;i++){
      if(k===nombres[i]+' '+regionesNorm[filas[i][2]])return resultado([i]);
      if(k===nombres[i]||(ascii[i]&&k===ascii[i])||(aliasNombres.get(i)||[]).includes(k)){total++;if(indices.length<40)indices.push(i);}
    }
    return resultado(indices,total);
  }
  function buscar(texto){
    const q=normaliza(texto);if(!q)return [];
    const palabras=q.split(' '),mejores=[];
    const orden=(a,b)=>a.p-b.p||filas[b.i][6]-filas[a.i][6]||nombres[a.i].localeCompare(nombres[b.i])||filas[a.i][0]-filas[b.i][0];
    for(let i=0;i<filas.length;i++){
      const n=nombres[i],a=ascii[i],aliases=aliasNombres.get(i)||[];let p=4;
      if(n===q||a===q||aliases.includes(q))p=0;
      else if(n.startsWith(q)||(a&&a.startsWith(q))||aliases.some(s=>s.startsWith(q)))p=1;
      else if(n.includes(q)||(a&&a.includes(q)))p=2;
      else if(palabras.every(s=>n.includes(s)||a.includes(s)||regionesNorm[filas[i][2]].includes(s)||aliases.some(t=>t.includes(s))))p=3;
      if(p===4)continue;
      const v={i,p};if(mejores.length===40&&orden(v,mejores[39])>=0)continue;
      let pos=0;while(pos<mejores.length&&orden(mejores[pos],v)<=0)pos++;
      mejores.splice(pos,0,v);if(mejores.length>40)mejores.pop();
    }
    return mejores.map(x=>ciudad(x.i));
  }
  function cercanasLinea(a,eje,geometria){
    if(!a||!Number.isFinite(a.lonMC)||!Number.isFinite(a.dec)||!['AC','MC','DC','IC'].includes(eje))throw Error('Línea astrocartográfica inválida.');
    const mejores=[];
    for(let i=0;i<filas.length;i++){
      const f=filas[i],d=geometria.distancia(a,eje,f[3],f[4]);
      if(mejores.length===12&&d.km>=mejores[11].km)continue;
      let pos=0;while(pos<mejores.length&&mejores[pos].km<=d.km)pos++;
      mejores.splice(pos,0,{i,...d});if(mejores.length>12)mejores.pop();
    }
    return mejores.map(({i,...d})=>({c:ciudad(i),...d}));
  }
  let atlas=null,ultimaLinea=null;
  function divisiones(){
    if(atlas)return atlas;
    const paises=new Map(),porNombre=new Map(),indices=[],grupos=new Map();
    const limpias=regiones.map(r=>String(r).replace(/\s*·\s*GeoNames\s+\d+\s*$/i,'').trim());
    // La última pareja (CC) identifica el país, aunque el nombre contenga
    // paréntesis o la subdivisión tenga varias comas. Los sufijos GeoNames
    // desambiguaban ciudades, no representan subdivisiones diferentes.
    for(const r of limpias){
      const m=r.match(/^(.*?)\s*\(([a-z]{2})\)\s*$/i);if(!m)continue;
      const codigo=m[2].toUpperCase(),nombre=m[1].slice(m[1].lastIndexOf(',')+1).trim();
      if(!paises.has(codigo))paises.set(codigo,{codigo,nombre});
      porNombre.set(normaliza(nombre),codigo);
    }
    for(let i=0;i<limpias.length;i++){
      const r=limpias[i],m=r.match(/^(.*?)\s*\(([a-z]{2})\)\s*$/i);
      let codigo,prefijo;
      if(m){codigo=m[2].toUpperCase();prefijo=m[1].slice(0,Math.max(0,m[1].lastIndexOf(','))).trim();}
      else{
        // Dos etiquetas de compatibilidad del catálogo original carecen de (CC).
        const partes=r.split(','),final=partes.at(-1).trim();
        codigo=porNombre.get(normaliza(final))||(paises.has(final.toUpperCase())?final.toUpperCase():'ZZ');
        prefijo=partes.slice(0,-1).join(',').trim();
        if(!paises.has(codigo))paises.set(codigo,{codigo,nombre:'País no especificado'});
      }
      // generar-ciudades.cjs escribe admin1 antes del país y antepone admin2
      // solo para homónimos. Una provincia incluye también esos municipios.
      const nombre=prefijo.split(',').at(-1).trim()||'Sin región especificada',clave=codigo+'|'+normaliza(nombre);
      if(!grupos.has(clave))grupos.set(clave,{id:String(i),nombre,pais:codigo});
      indices[i]=grupos.get(clave);
    }
    const compara=(a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'})||(a.codigo||a.id).localeCompare(b.codigo||b.id);
    atlas={paises:[...paises.values()].sort(compara),regiones:[...grupos.values()].sort(compara),indices};
    return atlas;
  }
  function distanciasLinea(a,eje,geometria){
    if(!a||!Number.isFinite(a.lonMC)||!Number.isFinite(a.dec)||Math.abs(a.dec)>90||!['AC','MC','DC','IC'].includes(eje)||!geometria||typeof geometria.distancia!=='function')throw Error('Línea astrocartográfica inválida.');
    const lonMC=((a.lonMC+180)%360+360)%360-180,clave=[lonMC,a.dec,eje].join('|');
    if(ultimaLinea&&ultimaLinea.clave===clave&&ultimaLinea.geometria===geometria)return ultimaLinea;
    const km=new Float64Array(filas.length),grados=new Float64Array(filas.length),orden=[];
    const entrada={lonMC,dec:a.dec};
    km.fill(Infinity);grados.fill(NaN);
    for(let i=0;i<filas.length;i++){
      const f=filas[i];if(!Number.isFinite(f[3])||!Number.isFinite(f[4])||Math.abs(f[3])>90||Math.abs(f[4])>180)continue;
      const d=geometria.distancia(entrada,eje,f[3],f[4]);
      if(!d||!Number.isFinite(d.km)||!Number.isFinite(d.grados)||d.km<0||d.grados<0)continue;
      km[i]=d.km;grados[i]=d.grados;orden.push(i);
    }
    orden.sort((a,b)=>km[a]-km[b]||nombres[a].localeCompare(nombres[b],'es')||filas[a][0]-filas[b][0]);
    // Solo la última línea permanece en memoria. Páginas, radios y países
    // reutilizan sus distancias sin recalcular ni transferir el catálogo.
    return ultimaLinea={clave,geometria,km,grados,orden};
  }
  function explorarLinea(a,eje,opciones,geometria){
    const o=opciones&&typeof opciones==='object'?opciones:{},d=distanciasLinea(a,eje,geometria),at=divisiones();
    const entero=(v,def,max)=>{
      if(v===undefined||v===null||v===''||!['number','string'].includes(typeof v))return def;
      const n=Number(v);return Number.isFinite(n)?Math.max(1,Math.min(max,Math.floor(n))):def;
    };
    const numeroRadio=o.radioKm===undefined||o.radioKm===''||!['number','string'].includes(typeof o.radioKm)?300:Number(o.radioKm);
    const radioKm=o.radioKm===null?null:Number.isFinite(numeroRadio)?Math.max(0,Math.min(20040,numeroRadio)):300;
    const limite=entero(o.limite,24,100),solicitada=entero(o.pagina,1,Number.MAX_SAFE_INTEGER);
    const codigo=typeof o.pais==='string'?o.pais.trim().toUpperCase():'';
    const pais=at.paises.some(p=>p.codigo===codigo)?codigo:'';
    const regionIndice=typeof o.region==='string'||typeof o.region==='number'?String(o.region).trim():'';
    const regionDato=/^\d+$/.test(regionIndice)?at.indices[Number(regionIndice)]:null;
    const region=pais&&regionDato&&regionDato.pais===pais?regionDato.id:'';
    const cuentasPais=new Map(),cuentasRegion=new Map(),porPais=new Map();let elegidos=[];
    for(const i of d.orden){
      if(radioKm!==null&&d.km[i]>radioKm)break;
      const r=at.indices[filas[i][2]],cc=r.pais;
      cuentasPais.set(cc,(cuentasPais.get(cc)||0)+1);
      if(pais){
        if(cc!==pais)continue;
        cuentasRegion.set(r.id,(cuentasRegion.get(r.id)||0)+1);
        if(!region||r.id===region)elegidos.push(i);
      }else{
        if(!porPais.has(cc))porPais.set(cc,[]);
        porPais.get(cc).push(i);
      }
    }
    if(!pais){
      // Una localidad por país en cada ronda: se preserva la distancia dentro
      // de cada país sin permitir que un meridiano europeo monopolice la lista.
      const grupos=[...porPais.entries()].sort((a,b)=>d.km[a[1][0]]-d.km[b[1][0]]||a[0].localeCompare(b[0])).map(p=>p[1]);
      let pendientes=grupos;
      for(let ronda=0;pendientes.length;ronda++){
        const siguientes=[];
        for(const grupo of pendientes){elegidos.push(grupo[ronda]);if(ronda+1<grupo.length)siguientes.push(grupo);}
        pendientes=siguientes;
      }
    }
    const total=elegidos.length,paginas=Math.ceil(total/limite),pagina=Math.min(solicitada,paginas||1);
    const nombresPais=new Map(at.paises.map(p=>[p.codigo,p.nombre]));
    return {
      filas:elegidos.slice((pagina-1)*limite,pagina*limite).map(i=>{
        const r=at.indices[filas[i][2]];
        return{c:{...ciudad(i),pais:r.pais,paisNombre:nombresPais.get(r.pais),region:r.id},grados:d.grados[i],km:d.km[i]};
      }),
      total,pagina,paginas,limite,pais,region,radioKm,
      paises:at.paises.map(p=>({...p,total:cuentasPais.get(p.codigo)||0})),
      regiones:at.regiones.filter(r=>r.pais===pais).map(({id,nombre})=>({id,nombre,total:cuentasRegion.get(id)||0}))
    };
  }
  return{buscar,resolver,cercanasLinea,explorarLinea,meta:{total:filas.length,version:datos.version,fuente:datos.fuente,zonas}};
}
const api={normaliza,crear};
if(typeof module==='object'&&module.exports)module.exports=api;else root.CiudadesMotor=api;
})(typeof self!=='undefined'?self:globalThis);
