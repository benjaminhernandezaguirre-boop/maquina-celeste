(function(root){
  'use strict';
  const mod = x => ((x % 360) + 360) % 360;
  // No recalcular casas dirigidas: conservan las anchuras de las natales.
  function casasDe(carta, arco = 0){
    if(!carta?.ang || !carta?.cusp || carta.datos?.horaConocida === false) return null;
    return {
      cusp: [null, ...Array.from({length:12}, (_,i)=>mod(carta.cusp[i+1]+arco))],
      ang: {asc:mod(carta.ang.asc+arco), mc:mod(carta.ang.mc+arco)},
      sistema:carta.datos?.sistemaReal || carta.datos?.sistema,
      aviso:carta.aviso || null
    };
  }
  function filtrar(capa, escuela){
    if(!capa || !escuela) return capa;
    const fuera=new Set(escuela.fuera || []);
    return {...capa,
      movidos:capa.movidos.filter(p=>escuela.complementaria || !fuera.has(p.id))
        .map(p=>({...p,complementario:fuera.has(p.id)})),
      cerca:capa.cerca.filter(c=>!fuera.has(c.P.id) && !fuera.has(c.N.id))
    };
  }
  const api={casasDe,filtrar};
  root.NatalCapas=api;
  if(typeof module==='object' && module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
