/* Pintor de astrocartografía. Geometría nativa 2160 × 1080; símbolos,
   etiquetas, grosores y selección siempre se miden en píxeles CSS. */
(function(root){
"use strict";
const ANCHO=2160,ALTO=1080;
const nativo=([lon,lat])=>[(lon+180)/360*ANCHO,(90-lat)/180*ALTO];
const limitar=(x,min,max)=>Math.max(min,Math.min(max,x));
const estilos={AC:{ancho:1.4,guion:[]},DC:{ancho:1.4,guion:[7,5]},MC:{ancho:1.8,guion:[]},IC:{ancho:1.8,guion:[2,5]}};
function color(hex,claro){
  if(!claro||!/^#[0-9a-f]{6}$/i.test(hex))return hex;
  return '#'+hex.slice(1).match(/../g).map(v=>Math.round(parseInt(v,16)*.58).toString(16).padStart(2,'0')).join('');
}
// Recorta segmentos a la ventana antes de medir distancias o situar etiquetas.
function recortar(x1,y1,x2,y2,w,h){
  const dx=x2-x1,dy=y2-y1,p=[-dx,dx,-dy,dy],q=[x1,w-x1,y1,h-y1];let lo=0,hi=1;
  for(let i=0;i<4;i++){
    if(Math.abs(p[i])<1e-12){if(q[i]<0)return null;continue;}
    const r=q[i]/p[i];if(p[i]<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);
    if(lo>hi)return null;
  }
  return {x1:x1+lo*dx,y1:y1+lo*dy,x2:x1+hi*dx,y2:y1+hi*dy};
}
function distancia(x,y,s){
  const dx=s.x2-s.x1,dy=s.y2-s.y1,l=dx*dx+dy*dy;
  const t=l?limitar(((x-s.x1)*dx+(y-s.y1)*dy)/l,0,1):0;
  return Math.hypot(x-s.x1-t*dx,y-s.y1-t*dy);
}
function crear(canvas,vista,opciones={}){
  const g=canvas.getContext('2d'),geo=opciones.geo;
  if(!g||!geo||typeof geo.curva!=='function')throw new Error('El mapa necesita un lienzo y la geometría AstroGeo.');
  const tierra=(opciones.tierra||[]).map(r=>r.map(nativo));
  const fronteras=(opciones.fronteras||[]).map(r=>r.map(nativo));
  let geometria=new Map(),firma='',lineas=[],etiquetas=[],seleccion=null,claro=true,dpr=1;
  const pantalla=([x,y])=>({x:x*vista.escala+vista.x,y:y*vista.escala+vista.y});
  function css(){g.setTransform(dpr,0,0,dpr,0,0);}
  function mundo(){g.setTransform(dpr*vista.escala,0,0,dpr*vista.escala,dpr*vista.x,dpr*vista.y);}
  function caja(x,y,w,h,r=5){
    g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);
  }
  function camino(puntos,cerrar,partir=true){
    let previo=null;g.beginPath();
    for(const [x,y]of puntos){
      if(partir&&previo!==null&&Math.abs(x-previo)>ANCHO/2){
        if(cerrar){g.closePath();g.fill();}else g.stroke();
        g.beginPath();g.moveTo(x,y);
      }else if(previo===null)g.moveTo(x,y);else g.lineTo(x,y);
      previo=x;
    }
    if(cerrar){g.closePath();g.fill();}else g.stroke();
  }
  function base(){
    css();g.globalAlpha=1;g.fillStyle=claro?'#f5f8f9':'#050c18';g.fillRect(0,0,vista.width,vista.height);
    mundo();g.fillStyle=claro?'#e8eff2':'#081323';g.fillRect(0,0,ANCHO,ALTO);
    g.fillStyle=claro?'#d1ddd5':'#243447';for(const r of tierra)camino(r,true);
    g.lineJoin='round';g.lineCap='round';g.setLineDash([]);
    g.strokeStyle=claro?'#9aaeb0':'#415569';g.lineWidth=.65/vista.escala;
    for(const r of fronteras)camino(r,false);
    g.strokeStyle=claro?'#718c95':'#7188a1';g.lineWidth=.8/vista.escala;
    for(const r of tierra)camino(r,false);
    g.strokeStyle=claro?'#173a4924':'#e4efff1c';g.lineWidth=.65/vista.escala;
    for(let lon=-150;lon<=150;lon+=30){const x=(lon+180)/360*ANCHO;camino([[x,0],[x,ALTO]],false,false);}
    for(let lat=-60;lat<=60;lat+=30){const y=(90-lat)/180*ALTO;camino([[0,y],[ANCHO,y]],false,false);}
    g.strokeStyle=claro?'#173a493a':'#e4efff30';g.setLineDash([3/vista.escala,6/vista.escala]);
    for(const lat of [23.44,-23.44,66.56,-66.56]){const y=(90-lat)/180*ALTO;camino([[0,y],[ANCHO,y]],false,false);}
    g.setLineDash([]);g.lineWidth=1/vista.escala;camino([[0,ALTO/2],[ANCHO,ALTO/2]],false,false);
    css();g.font="10px 'IBM Plex Mono', monospace";g.fillStyle=claro?'#415d6a':'#a9bdcf';
    g.textAlign='center';g.textBaseline='bottom';
    const abajo=Math.min(vista.height-4,vista.y+ALTO*vista.escala-4);
    for(let lon=-150;lon<=150;lon+=30){const p=vista.aPantalla(lon,0);if(p.x>22&&p.x<vista.width-22&&abajo>12)g.fillText(lon<0?`${-lon}°O`:lon>0?`${lon}°E`:'0°',p.x,abajo);}
    g.textAlign='left';g.textBaseline='middle';
    const izq=Math.max(4,vista.x+4);
    for(let lat=-60;lat<=60;lat+=30){const p=vista.aPantalla(0,lat);if(p.y>16&&p.y<vista.height-20&&izq<vista.width-30)g.fillText(lat<0?`${-lat}°S`:lat>0?`${lat}°N`:'0°',izq,p.y);}
  }
  function preparar(astros,ejes){
    const nueva=astros.map(a=>`${a.id}:${a.lonMC}:${a.dec}`).join(';')+'|'+ejes.join(',');
    if(nueva!==firma){geometria.clear();firma=nueva;}
    lineas=[];
    for(const a of astros)for(const eje of ejes){
      if(!estilos[eje])continue;
      const key=a.id+'|'+eje;
      if(!geometria.has(key))geometria.set(key,geo.curva(a,eje).map(tramo=>tramo.map(nativo)));
      const tramos=geometria.get(key),segmentos=[];
      for(const tramo of tramos)for(let i=1;i<tramo.length;i++){
        const p=pantalla(tramo[i-1]),q=pantalla(tramo[i]);
        const s=recortar(p.x,p.y,q.x,q.y,vista.width,vista.height);if(s)segmentos.push(s);
      }
      lineas.push({a,eje,key,tramos,segmentos});
    }
  }
  function pintarLineas(){
    mundo();g.lineCap='round';g.lineJoin='round';
    const orden=lineas.slice().sort((a,b)=>Number(a.key===seleccion)-Number(b.key===seleccion));
    for(const l of orden){
      const activa=l.key===seleccion,estilo=estilos[l.eje];
      g.strokeStyle=color(l.a.c,claro);g.lineWidth=(activa?3:estilo.ancho)/vista.escala;
      g.globalAlpha=seleccion&&!activa ? .18 : 1;
      g.setLineDash(estilo.guion.map(n=>n/vista.escala));
      // Cada tramo ya está cortado en el antimeridiano: nunca se unen sus extremos.
      for(const tramo of l.tramos){
        g.beginPath();for(let i=0;i<tramo.length;i++){const [x,y]=tramo[i];if(i)g.lineTo(x,y);else g.moveTo(x,y);}g.stroke();
      }
    }
    g.globalAlpha=1;g.setLineDash([]);css();
  }
  function ancla(l){
    if(!l.segmentos.length)return null;
    const deseado=l.eje==='MC'||l.eje==='IC'?26:vista.height*(l.eje==='AC'?.43:.57);
    let mejor=null,peso=Infinity;
    for(const s of l.segmentos){
      const t=Math.abs(s.y2-s.y1)>1e-8?limitar((deseado-s.y1)/(s.y2-s.y1),0,1):.5;
      const p={x:s.x1+t*(s.x2-s.x1),y:s.y1+t*(s.y2-s.y1)};
      const d=Math.abs(p.y-deseado)+Math.abs(p.x-vista.width/2)*.02;
      if(d<peso){mejor=p;peso=d;}
    }
    return mejor;
  }
  function solapa(a,b){return a.x<b.x+b.w+4&&a.x+a.w>b.x-4&&a.y<b.y+b.h+4&&a.y+a.h>b.y-4;}
  function ubicacion(p,ocupados,w=55,h=30){
    if(vista.width<w+8||vista.height<h+8)return null;
    for(const dy of [-24,24,-60,60,-96,96,-132,132])for(const dx of [0,-62,62,-124,124]){
      const r={x:limitar(p.x+dx-w/2,4,vista.width-w-4),y:limitar(p.y+dy-h/2,4,vista.height-h-4),w,h};
      if(!ocupados.some(o=>solapa(r,o))){ocupados.push(r);return r;}
    }
    return null;
  }
  function pintarEtiquetas(reservados){
    etiquetas=[];const ocupados=reservados.slice();
    const visibleW=Math.max(0,Math.min(vista.width,vista.x+ANCHO*vista.escala)-Math.max(0,vista.x));
    const visibleH=Math.max(0,Math.min(vista.height,vista.y+ALTO*vista.escala)-Math.max(0,vista.y));
    const limite=Math.max(1,Math.min(40,Math.floor(visibleW*visibleH/9500)));
    // En una pantalla pequeña se ofrece primero una línea visible de cada astro.
    // El resto sigue siendo seleccionable, aunque no quepan todas sus etiquetas.
    const prioridad=new Map(),anclas=new Map();
    for(const l of lineas)anclas.set(l.key,ancla(l));
    for(const id of new Set(lineas.map(l=>l.a.id))){
      const cercanas=lineas.filter(l=>l.a.id===id&&anclas.get(l.key)).sort((a,b)=>{
        const p=anclas.get(a.key),q=anclas.get(b.key);
        return Math.hypot(p.x-vista.width/2,p.y-vista.height/2)-Math.hypot(q.x-vista.width/2,q.y-vista.height/2);
      });
      cercanas.forEach((l,i)=>prioridad.set(l.key,i));
    }
    const orden=lineas.slice().sort((a,b)=>Number(b.key===seleccion)-Number(a.key===seleccion)||(prioridad.get(a.key)??99)-(prioridad.get(b.key)??99));
    for(const l of orden){
      // La ficha activa identifica una sola línea; las demás conservan el trazo
      // atenuado y la selección directa, sin competir con otra etiqueta.
      if(seleccion&&l.key!==seleccion)continue;
      if(etiquetas.length>=limite)break;
      const p=anclas.get(l.key);if(!p)continue;
      const r=ubicacion(p,ocupados);if(!r)continue;
      etiquetas.push({...r,id:l.a.id,eje:l.eje});
      g.globalAlpha=seleccion&&l.key!==seleccion ? .45 : 1;
      const tinta=color(l.a.c,claro),x=r.x+r.w/2,y=r.y+r.h/2;
      const ex=limitar(p.x,r.x+3,r.x+r.w-3),ey=limitar(p.y,r.y+3,r.y+r.h-3);
      if(Math.hypot(ex-p.x,ey-p.y)>3){
        g.strokeStyle=tinta;g.lineWidth=.85;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(ex,ey);g.stroke();
        g.fillStyle=tinta;g.beginPath();g.arc(p.x,p.y,1.9,0,Math.PI*2);g.fill();
      }
      g.fillStyle=claro?'#fffef9f5':'#09172bf5';g.strokeStyle=tinta;g.lineWidth=l.key===seleccion?1.8:1;
      caja(r.x,r.y,r.w,r.h);g.fill();g.stroke();g.fillStyle=tinta;
      g.textAlign='center';g.textBaseline='middle';
      if(l.a.id==='pluton'&&typeof opciones.trazaPluton==='function')opciones.trazaPluton(g,x-11,y,18);
      else{g.font='18px Spectral, serif';g.fillText(l.a.g,x-11,y);}
      g.font="600 11px 'IBM Plex Mono', monospace";g.fillText(l.eje,x+12,y+.5);
    }
    g.globalAlpha=1;
  }
  function marcadores(carta,marca){
    const out=[];
    for(const [dato,tipo,texto]of [[carta,'natal','Nacimiento'],[marca,'consulta','Consulta']]){
      if(!dato||!Number.isFinite(dato.lat)||!Number.isFinite(dato.lon))continue;
      const p=vista.aPantalla(dato.lon,dato.lat);if(!p||p.x<0||p.y<0||p.x>vista.width||p.y>vista.height)continue;
      const r={x:limitar(p.x-45,3,Math.max(3,vista.width-93)),y:limitar(p.y+(tipo==='natal'?-32:12),3,Math.max(3,vista.height-25)),w:90,h:22};
      out.push({p,tipo,texto,r});
    }
    return out;
  }
  function pintarMarcadores(lista){
    g.globalAlpha=1;g.setLineDash([]);
    for(const m of lista){
      const {p,tipo,texto,r}=m,tinta=tipo==='natal'?(claro?'#926612':'#f3cc6c'):(claro?'#086977':'#8de7f1');
      g.fillStyle=tinta;g.strokeStyle=claro?'#fffef9':'#081323';g.lineWidth=2.5;g.beginPath();
      if(tipo==='natal')g.arc(p.x,p.y,5.5,0,Math.PI*2);
      else{g.moveTo(p.x,p.y-7);g.lineTo(p.x+7,p.y);g.lineTo(p.x,p.y+7);g.lineTo(p.x-7,p.y);g.closePath();}
      g.fill();g.stroke();
      g.fillStyle=claro?'#fffef9ef':'#09172bef';g.strokeStyle=tinta;g.lineWidth=.8;
      caja(r.x,r.y,r.w,r.h);g.fill();g.stroke();
      g.font="600 10px 'IBM Plex Mono', monospace";g.textAlign='center';g.textBaseline='middle';g.fillStyle=tinta;g.fillText(texto,r.x+r.w/2,r.y+r.h/2);
    }
  }
  function pintar(estado={}){
    dpr=Math.max(1,Math.min(4,root&&Number.isFinite(root.devicePixelRatio)?root.devicePixelRatio:1));
    const width=Math.max(1,Math.round(vista.width*dpr)),height=Math.max(1,Math.round(vista.height*dpr));
    if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
    claro=estado.claro!==false;seleccion=estado.seleccion||null;
    const astros=Array.isArray(estado.astros)?estado.astros:[],ejes=Array.from(estado.ejes||[]);
    preparar(astros,ejes);base();pintarLineas();
    const marcas=marcadores(estado.carta,estado.marca);
    pintarEtiquetas(marcas.flatMap(m=>[m.r,{x:m.p.x-9,y:m.p.y-9,w:18,h:18}]));pintarMarcadores(marcas);
  }
  function elegirLinea(x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>vista.width||y>vista.height)return null;
    for(const r of etiquetas)if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)return {id:r.id,eje:r.eje};
    let encontrada=null,min=10;
    const orden=lineas.slice().sort((a,b)=>Number(b.key===seleccion)-Number(a.key===seleccion));
    for(const l of orden)for(const s of l.segmentos){const d=distancia(x,y,s);if(d<=min&&(!encontrada||d<min-1e-8)){min=d;encontrada={id:l.a.id,eje:l.eje};}}
    return encontrada;
  }
  return {pintar,elegirLinea};
}
const API={crear};if(typeof module!=='undefined'&&module.exports)module.exports=API;if(root)root.AstroMapa=API;
})(typeof window!=='undefined'?window:null);
