/* Birrueda independiente del estado de la aplicación. Todas las longitudes
   recibidas pertenecen al mismo marco; sólo el zodiaco usa el desfase. */
(function(root, fabrica){
  const api = fabrica();
  if(typeof module === 'object' && module.exports) module.exports = api;
  if(root) root.NatalBirrueda = api;
})(typeof window !== 'undefined' ? window : globalThis, function(){
  'use strict';

  const RAD = Math.PI / 180, TAU = Math.PI * 2;
  const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const SIGNOS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map((g, i)=>({g, el:['fuego','tierra','aire','agua'][i%4]}));
  const mod = n => ((n % 360) + 360) % 360;
  const finito = n => typeof n === 'number' && Number.isFinite(n);
  const diferencia = (a, b) => mod(a - b + 180) - 180;
  const aPant = (lon, asc = 0) => (180 - mod(lon - (finito(asc) ? asc : 0))) * RAD;
  function punto(lon, r, cx = 0, cy = 0, asc = 0){
    const a = aPant(lon, asc);
    return {x:cx + Math.cos(a)*r, y:cy + Math.sin(a)*r};
  }

  function geometria(R, cx = 0, cy = 0){
    if(!finito(R) || R <= 0) throw new RangeError('El radio debe ser positivo.');
    return {
      R, cx, cy, centro:R*.307,
      base:{min:R*.340, max:R*.605, casas:R*.365, planetas:R*.475, angulos:R*.577, ancla:R*.596},
      exterior:{min:R*.620, max:R*.866, casas:R*.646, planetas:R*.744, angulos:R*.839, ancla:R*.857},
      zodiaco:{min:R*.880, max:R, grados:R*.928, signos:R*.974},
      huella:R*.066, glifo:R*.057, texto:R*.023,
      leyenda:{x:cx, y:cy + R*1.055}
    };
  }

  /** Un único conjunto de 360 marcas, siempre en el marco del zodiaco. */
  function graduacion(desfase = 0){
    const dz = finito(desfase) ? desfase : 0;
    return Array.from({length:360}, (_, grado)=>({
      grado, lon:mod(grado + dz),
      nivel:grado%30 === 0 ? 30 : grado%10 === 0 ? 10 : grado%5 === 0 ? 5 : 1,
      etiqueta:grado%30 === 0 ? '0°/30°' : grado%10 === 0 ? `${grado%30}°` : null
    }));
  }

  /** Las cúspides describen casas; los ángulos proceden exclusivamente de ang. */
  function casas(cusp, ang){
    const sectores = [], ejes = [];
    if(cusp){
      const desdeCero = Array.isArray(cusp) && cusp.length === 12;
      for(let i = 1; i <= 12; i++){
        const inicio = cusp[desdeCero ? i-1 : i];
        const siguiente = cusp[desdeCero ? i%12 : i===12 ? 1 : i+1];
        if(finito(inicio) && finito(siguiente)) sectores.push({
          numero:i, lon:mod(inicio), fin:mod(siguiente), medio:mod(inicio + mod(siguiente-inicio)/2)
        });
      }
    }
    if(ang){
      const valores = [
        ['asc', 'ASC', 'Ascendente', ang.asc], ['mc', 'MC', 'Medio Cielo', ang.mc],
        ['dsc', 'DSC', 'Descendente', finito(ang.dsc) ? ang.dsc : finito(ang.asc) ? ang.asc+180 : null],
        ['ic', 'IC', 'Fondo del Cielo', finito(ang.ic) ? ang.ic : finito(ang.mc) ? ang.mc+180 : null]
      ];
      for(const [id, glifo, nombre, lon] of valores) if(finito(lon)) ejes.push({id, glifo, nombre, lon:mod(lon), tipo:'angulo'});
    }
    return {sectores, ejes};
  }

  // Regresión isotónica: separa grupos conservando el orden zodiacal y el
  // centro angular del grupo. No modifica el radio ni la longitud astronómica.
  function isotona(valores){
    const bloques = [];
    valores.forEach((valor, i)=>{
      bloques.push({suma:valor, n:1, primero:i, ultimo:i});
      while(bloques.length > 1){
        const b = bloques[bloques.length-1], a = bloques[bloques.length-2];
        if(a.suma/a.n <= b.suma/b.n) break;
        bloques.splice(-2, 2, {suma:a.suma+b.suma, n:a.n+b.n, primero:a.primero, ultimo:b.ultimo});
      }
    });
    const salida = [];
    for(const b of bloques) for(let i=b.primero; i<=b.ultimo; i++) salida[i] = b.suma/b.n;
    return salida;
  }

  /** Colocación circular de una banda. Los discos de radio huella no se
      intersectan. El desplazamiento queda acotado a 120°, incluso en grupos
      degenerados. Una población excepcionalmente grande reduce su tamaño. */
  function colocacion(cuerpos, banda, opciones = {}){
    const lista = (cuerpos || []).filter(c=>c && finito(c.lon)).map((cuerpo, indice)=>({cuerpo, indice, lon:mod(cuerpo.lon)}));
    const n = lista.length;
    if(!n) return [];
    const radio = banda.planetas;
    const limite = finito(opciones.maxDesplazamiento) ? Math.max(1, Math.min(150, opciones.maxDesplazamiento)) : 120;
    const solicitada = finito(opciones.huella) ? opciones.huella : radio*.12;
    let paso = Math.min(2*Math.asin(Math.min(.45, solicitada/radio))/RAD + .15, 359/n, n>1 ? 2*limite/(n-1) : 360);
    const orden = lista.slice().sort((a,b)=>a.lon-b.lon || a.indice-b.indice);
    let mejor;
    // Probar todos los cortes resuelve también un grupo que cruza 359°/0°.
    for(let intento=0; intento<30 && !mejor; intento++, paso*=.94){
      for(let corte=0; corte<n; corte++){
        const secuencia = orden.slice(corte).concat(orden.slice(0,corte));
        const reales = secuencia.map((v,i)=>v.lon + (i && v.lon<secuencia[0].lon ? 360 : 0));
        // Los empates a ambos lados del corte requieren el mismo desenvolvimiento.
        for(let i=1; i<n; i++) if(reales[i]<reales[i-1]) reales[i]+=360;
        const iso = isotona(reales.map((lon,i)=>lon-i*paso));
        const visibles = iso.map((lon,i)=>lon+i*paso);
        if(n>1 && visibles[n-1]-visibles[0] > 360-paso+1e-7) continue;
        const desplazamientos = visibles.map((lon,i)=>diferencia(lon,reales[i]));
        if(desplazamientos.some(d=>Math.abs(d)>limite+1e-7)) continue;
        const coste = desplazamientos.reduce((s,d)=>s+d*d,0);
        if(!mejor || coste<mejor.coste-1e-7) mejor = {secuencia, visibles, coste, paso};
      }
    }
    // Con paso <= 359/n siempre existe una distribución circular factible.
    if(!mejor) throw new Error('No se pudo distribuir la población en la banda.');
    const huella = Math.min(solicitada, radio*Math.sin(mejor.paso*RAD/2)*.995);
    return mejor.secuencia.map((v,i)=>({
      cuerpo:v.cuerpo, indice:v.indice, lon:v.lon, lonVisible:mod(mejor.visibles[i]),
      desplazamiento:diferencia(mejor.visibles[i],v.lon), radio, huella
    })).sort((a,b)=>a.indice-b.indice);
  }

  function pintar(g, opciones){
    const o = opciones || {}, base = o.base || {}, capa = o.capa || {};
    const geo = geometria(o.R, o.cx || 0, o.cy || 0), R = geo.R;
    const asc = base.ang && finito(base.ang.asc) ? base.ang.asc : 0;
    const oscuro = !!o.oscuro, p = o.papel || {}, blancos = [];
    const color = {
      base:oscuro ? '#8FCDFF' : '#255F95', exterior:oscuro ? '#F2B18B' : '#A44D21',
      fondo:p.fondo || (oscuro ? '#0B1220' : '#F4F0E6'),
      borde:p.borde || (oscuro ? '#40516A' : '#CFC7B4'),
      tinta:p.tinta || (oscuro ? '#E9EDF3' : '#22212B'),
      suave:p.suave || (oscuro ? '#A8B5C7' : '#6B6A78'),
      elementos:p.el || (oscuro ? {fuego:'#EDAA8B',tierra:'#B5C68E',aire:'#A4BDDF',agua:'#8EC5DC'} : {fuego:'#A63116',tierra:'#3C611F',aire:'#364E85',agua:'#155B87'}),
      aspectos:p.asp || {'a-oro':'#AA8430','a-rojo':'#CA6249','a-azul':'#5687BF','a-lila':'#967DBC','a-verde':'#21754B','a-violeta':'#8851B8'}
    };
    const pos = (lon,r)=>punto(lon,r,geo.cx,geo.cy,asc);
    const linea = (a,b)=>{g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke();};
    const circulo = (r)=>{g.beginPath(); g.arc(geo.cx,geo.cy,r,0,TAU);};
    const texto = (s,x,y,tam,tinta,peso = '500',ancho)=>{
      g.fillStyle=tinta; g.font=`${peso} ${tam}px "IBM Plex Mono", monospace`;
      g.textAlign='center'; g.textBaseline='middle';
      if(ancho) g.fillText(s,x,y,ancho); else g.fillText(s,x,y);
    };
    const anillo = (min,max,tinta,alpha)=>{
      g.save(); g.globalAlpha=alpha; g.fillStyle=tinta;
      g.beginPath(); g.arc(geo.cx,geo.cy,max,0,TAU); g.arc(geo.cx,geo.cy,min,TAU,0,true); g.fill('evenodd'); g.restore();
    };
    const glifo = o.pintaGlifo || ((ctx,s,x,y,tam)=>{ctx.font=`600 ${tam}px Spectral, serif`;ctx.fillText(s,x,y);});
    const activa = (clave,id)=>o.vivo && (o.seleccion===clave || o.sobre===clave || o.seleccion===id || o.sobre===id);
    function blanco(cuerpo, banda, x, y, r){
      blancos.push({id:cuerpo.id, seleccionId:`${banda}:${cuerpo.id}`,x,y,r,capa:banda,cuerpo});
    }
    const propias = {base:casas(base.cusp,base.ang), exterior:casas(capa.casas && capa.casas.cusp,capa.casas && capa.casas.ang)};

    g.save();
    g.setLineDash([]); g.lineWidth=Math.max(.6,R*.0025);
    circulo(R); g.fillStyle=color.fondo; g.fill();
    anillo(geo.base.min,geo.base.max,color.base,oscuro ? .065 : .037);
    anillo(geo.exterior.min,geo.exterior.max,color.exterior,oscuro ? .06 : .037);

    // Una sola corona zodiacal. Los ticks y los sectores comparten el desfase.
    const signos = o.signos && o.signos.length===12 ? o.signos : SIGNOS;
    const dz = finito(o.desfase) ? o.desfase : 0;
    signos.forEach((s,i)=>{
      const a0=aPant(i*30+dz,asc), a1=aPant((i+1)*30+dz,asc);
      g.save(); g.globalAlpha=oscuro ? .14 : .09; g.fillStyle=color.elementos[s.el] || color.suave;
      g.beginPath(); g.arc(geo.cx,geo.cy,R,a1,a0); g.arc(geo.cx,geo.cy,geo.zodiaco.min,a0,a1,true); g.closePath(); g.fill(); g.restore();
      g.strokeStyle=color.borde; g.lineWidth=R*.0022;
      linea(pos(i*30+dz,geo.zodiaco.min),pos(i*30+dz,R));
      const q=pos(i*30+15+dz,geo.zodiaco.signos);
      g.fillStyle=color.elementos[s.el] || color.tinta; g.textAlign='center'; g.textBaseline='middle';
      glifo(g,s.g || s.glifo || '',q.x,q.y,R*.044);
    });
    for(const marca of graduacion(dz)){
      const longitud=R*({1:.008,5:.015,10:.024,30:.029}[marca.nivel]);
      g.strokeStyle=marca.nivel>=10 ? color.suave : color.borde;
      g.lineWidth=R*(marca.nivel>=10 ? .0027 : .0017);
      linea(pos(marca.lon,geo.zodiaco.min),pos(marca.lon,geo.zodiaco.min+longitud));
      if(marca.etiqueta){
        const q=pos(marca.lon,geo.zodiaco.grados);
        texto(marca.etiqueta,q.x,q.y,R*(marca.nivel===30 ? .023 : .026),color.suave,'500');
      }
    }

    for(const nombre of ['base','exterior']){
      const banda=geo[nombre], tinta=color[nombre], propia=propias[nombre];
      g.save(); g.strokeStyle=tinta; g.globalAlpha=oscuro ? .23 : .18; g.lineWidth=R*.002;
      for(const casa of propia.sectores) linea(pos(casa.lon,banda.min),pos(casa.lon,banda.max));
      g.restore();
      // Los ejes se trazan antes de los glifos para que ninguna línea tape
      // un planeta situado cerca del Ascendente o del Medio Cielo.
      g.save();g.strokeStyle=tinta;g.lineWidth=R*.0034;g.globalAlpha=.75;
      g.setLineDash(nombre==='exterior' ? [R*.010,R*.007] : []);
      for(const eje of propia.ejes) linea(pos(eje.lon,banda.min),pos(eje.lon,banda.max));
      g.restore();
      for(const casa of propia.sectores){
        const q=pos(casa.medio,banda.casas);
        g.fillStyle=color.fondo; g.beginPath();g.arc(q.x,q.y,R*.020,0,TAU);g.fill();
        texto(ROMANOS[casa.numero],q.x,q.y,R*.025,tinta,'500');
      }
      // Las líneas sólidas/discontinuas y las letras A/B permiten distinguir
      // ambas cartas también sin depender de la percepción del color.
      g.save(); g.strokeStyle=tinta; g.globalAlpha=.48; g.lineWidth=R*.0025;
      g.setLineDash(nombre==='exterior' ? [R*.008,R*.006] : []);
      circulo(banda.min); g.stroke(); circulo(banda.max);g.stroke(); g.restore();
    }

    // Todos los aspectos terminan en el círculo interior, en longitud real.
    for(const contacto of capa.cerca || []){
      if(!contacto || !contacto.P || !contacto.N || !finito(contacto.P.lon) || !finito(contacto.N.lon)) continue;
      const arco=finito(capa.arco) ? capa.arco : 0, asp=contacto.asp || {};
      g.strokeStyle=color.aspectos[asp.cl] || color.suave; g.lineWidth=R*.003;
      g.globalAlpha=.68; g.setLineDash(asp.mayor===false ? [R*.009,R*.009] : []);
      linea(pos(contacto.P.lon+arco,geo.centro),pos(contacto.N.lon,geo.centro));
    }
    g.globalAlpha=1; g.setLineDash([]);g.strokeStyle=color.borde;g.lineWidth=R*.002;
    circulo(geo.centro);g.stroke();circulo(geo.zodiaco.min);g.stroke();circulo(R);g.stroke();

    for(const nombre of ['base','exterior']){
      const banda=geo[nombre], tinta=color[nombre], propia=propias[nombre];
      const lista = nombre==='base' ? (base.cuerpos || []).concat(base.puntos || []) : capa.movidos || [];
      // Un ángulo ya rotulado en su banda no se duplica como planeta.
      const ejes = new Set(propia.ejes.map(e=>e.id));
      const astros = lista.filter(c=>c && !ejes.has(c.id));
      const puestos=colocacion(astros,banda,{huella:geo.huella});
      for(const c of puestos){
        const q=pos(c.lonVisible,c.radio), ancla=pos(c.lon,banda.ancla), clave=`${nombre}:${c.cuerpo.id}`;
        g.save();g.strokeStyle=tinta;g.globalAlpha=.31;g.lineWidth=R*.002;
        linea(ancla,q);g.restore();
        g.fillStyle=tinta;g.beginPath();g.arc(ancla.x,ancla.y,R*.0035,0,TAU);g.fill();
        const seleccionado=activa(clave,c.cuerpo.id), escala=Math.min(1,c.huella/geo.huella);
        g.fillStyle=color.fondo;g.beginPath();g.arc(q.x,q.y,c.huella*.96,0,TAU);g.fill();
        if(seleccionado){g.save();g.globalAlpha=.16;g.fillStyle=tinta;g.fill();g.restore();g.strokeStyle=tinta;g.lineWidth=R*.003;g.stroke();}
        g.fillStyle=tinta;g.textAlign='center';g.textBaseline='middle';
        glifo(g,c.cuerpo.glifo || c.cuerpo.id || '',q.x,q.y-R*.012*escala,geo.glifo*escala);
        if(c.cuerpo.complementario)texto('†',q.x+R*.034*escala,q.y-R*.032*escala,R*.026,tinta,'600');
        let grado;
        if(o.posicion) grado=o.posicion(c.cuerpo.lon);
        else {const minutos=Math.floor(mod(c.cuerpo.lon-dz)*60+1e-7)%1800;grado=`${Math.floor(minutos/60)}°${String(minutos%60).padStart(2,'0')}′`;}
        if(grado && typeof grado==='object') grado=grado.corto || grado.texto || '';
        texto(String(grado || '')+(c.cuerpo.retro ? ' ℞' : ''),q.x,q.y+R*.033*escala,geo.texto*escala,tinta,'500',R*.092*escala);
        blanco(c.cuerpo,nombre,q.x,q.y,c.huella);
      }
      for(const eje of propia.ejes){
        const q=pos(eje.lon,banda.angulos), clave=`${nombre}:${eje.id}`;
        g.fillStyle=color.fondo;g.beginPath();g.arc(q.x,q.y,R*.027,0,TAU);g.fill();
        if(activa(clave,eje.id)){g.strokeStyle=tinta;g.lineWidth=R*.003;g.stroke();}
        texto(eje.glifo,q.x,q.y,R*.025,tinta,'600');
        blanco(eje,nombre,q.x,q.y,R*.029);
      }
    }

    // La identificación permanece fuera del centro reservado a aspectos.
    const leyendas=[['base',`A · ${capa.etiquetaBase || base.etiqueta || 'Carta base'}`],['exterior',`B · ${capa.etiqueta || 'Capa exterior'}`]];
    if(o.leyenda!==false)leyendas.forEach(([nombre,etiqueta],i)=>{
      const x=geo.cx+(i ? 1 : -1)*R*.48, y=geo.leyenda.y;
      texto(etiqueta,x,y,R*.032,color[nombre],'600',R*.86);
    });
    if(o.leyenda!==false && capa.nota) texto(String(capa.nota),geo.cx,geo.leyenda.y+R*.050,R*.025,color.suave,'400',R*1.8);
    g.restore();
    return blancos;
  }

  return {pintar, geometria, graduacion, colocacion, casas, aPant, punto, mod};
});
