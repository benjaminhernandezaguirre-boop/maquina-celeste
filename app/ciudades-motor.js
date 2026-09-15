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
  return{buscar,resolver,cercanasLinea,meta:{total:filas.length,version:datos.version,fuente:datos.fuente,zonas}};
}
const api={normaliza,crear};
if(typeof module==='object'&&module.exports)module.exports=api;else root.CiudadesMotor=api;
})(typeof self!=='undefined'?self:globalThis);
