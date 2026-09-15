/* Cámara y gestos de un mapamundi equirectangular de 2160 × 1080.
   Las coordenadas de pantalla son píxeles CSS, independientes del DPR. */
(function(root){
"use strict";
const ANCHO=2160, ALTO=1080, ZOOM_MAX=32, UMBRAL_ARRASTRE=6;
const limitar=(n,min,max)=>Math.max(min,Math.min(max,n));
const dimension=n=>Number.isFinite(n)&&n>0?n:1;
function crear(width,height){
  const vista={width:dimension(width),height:dimension(height),escala:1,x:0,y:0,zoom:1};
  const ajuste=()=>Math.min(vista.width/ANCHO,vista.height/ALTO);
  function encuadrar(){
    vista.escala=ajuste()*vista.zoom;
    const w=ANCHO*vista.escala,h=ALTO*vista.escala;
    vista.x=w<=vista.width?(vista.width-w)/2:limitar(vista.x,vista.width-w,0);
    vista.y=h<=vista.height?(vista.height-h)/2:limitar(vista.y,vista.height-h,0);
    return vista;
  }
  function situar(nx,ny){
    vista.escala=ajuste()*vista.zoom;
    vista.x=vista.width/2-nx*vista.escala;
    vista.y=vista.height/2-ny*vista.escala;
    return encuadrar();
  }
  vista.mundo=function(){vista.zoom=1;return situar(ANCHO/2,ALTO/2);};
  vista.redimensionar=function(w,h){
    const nx=(vista.width/2-vista.x)/vista.escala,ny=(vista.height/2-vista.y)/vista.escala;
    vista.width=dimension(w);vista.height=dimension(h);
    return situar(nx,ny);
  };
  vista.centrar=function(lon,lat,zoom=4){
    if(!Number.isFinite(lon)||!Number.isFinite(lat))return vista;
    vista.zoom=limitar(Number.isFinite(zoom)?zoom:4,1,ZOOM_MAX);
    return situar((limitar(lon,-180,180)+180)/360*ANCHO,(90-limitar(lat,-90,90))/180*ALTO);
  };
  vista.acercar=function(factor,anchorX=vista.width/2,anchorY=vista.height/2){
    if(!Number.isFinite(factor)||factor<=0||!Number.isFinite(anchorX)||!Number.isFinite(anchorY))return vista;
    const nx=(anchorX-vista.x)/vista.escala,ny=(anchorY-vista.y)/vista.escala;
    vista.zoom=limitar(vista.zoom*factor,1,ZOOM_MAX);
    vista.escala=ajuste()*vista.zoom;
    vista.x=anchorX-nx*vista.escala;vista.y=anchorY-ny*vista.escala;
    return encuadrar();
  };
  vista.mover=function(dx,dy){
    if(Number.isFinite(dx)&&Number.isFinite(dy)){vista.x+=dx;vista.y+=dy;}
    return encuadrar();
  };
  vista.aMapa=function(xCSS,yCSS){
    if(!Number.isFinite(xCSS)||!Number.isFinite(yCSS)||xCSS<0||yCSS<0||xCSS>vista.width||yCSS>vista.height)return null;
    const nx=(xCSS-vista.x)/vista.escala,ny=(yCSS-vista.y)/vista.escala;
    // Tolera únicamente el redondeo flotante en los bordes; nunca repite el mundo.
    if(nx< -1e-7||nx>ANCHO+1e-7||ny< -1e-7||ny>ALTO+1e-7)return null;
    const x=limitar(nx,0,ANCHO),y=limitar(ny,0,ALTO);
    return {lon:x/ANCHO*360-180,lat:90-y/ALTO*180,x,y};
  };
  vista.aPantalla=function(lon,lat){
    if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon< -180||lon>180||lat< -90||lat>90)return null;
    return {x:vista.x+(lon+180)/360*ANCHO*vista.escala,y:vista.y+(90-lat)/180*ALTO*vista.escala};
  };
  return vista.mundo();
}
function conectar(canvas,vista,opciones={}){
  const cambio=typeof opciones.cambio==='function'?opciones.cambio:()=>{};
  const consulta=typeof opciones.consulta==='function'?opciones.consulta:()=>{};
  const seleccion=typeof opciones.seleccion==='function'?opciones.seleccion:()=>false;
  const puntos=new Map(),oyentes=[];
  let arrastrado=false,multiple=false,desconectado=false;
  function escuchar(tipo,fn,opts){canvas.addEventListener(tipo,fn,opts);oyentes.push([tipo,fn,opts]);}
  function impedir(e){if(e.cancelable!==false&&e.preventDefault)e.preventDefault();}
  function local(e){
    const r=canvas.getBoundingClientRect();
    const sx=r.width/(canvas.offsetWidth||r.width||1),sy=r.height/(canvas.offsetHeight||r.height||1);
    return {
      x:(e.clientX-r.left-(canvas.clientLeft||0)*sx)/sx*vista.width/(canvas.clientWidth||vista.width),
      y:(e.clientY-r.top-(canvas.clientTop||0)*sy)/sy*vista.height/(canvas.clientHeight||vista.height)
    };
  }
  function pareja(){
    const [a,b]=Array.from(puntos.values());
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distancia:Math.hypot(b.x-a.x,b.y-a.y)};
  }
  function soltar(id){try{if(canvas.hasPointerCapture&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}catch(_){} }
  escuchar('pointerdown',e=>{
    if(e.button!==undefined&&e.button!==0)return;
    if(!puntos.size){arrastrado=false;multiple=false;}
    const p=local(e);p.inicioX=p.x;p.inicioY=p.y;puntos.set(e.pointerId,p);
    if(puntos.size>1){multiple=true;arrastrado=true;}
    try{canvas.setPointerCapture(e.pointerId);}catch(_){}
    try{canvas.focus({preventScroll:true});}catch(_){}
    impedir(e);
  });
  escuchar('pointermove',e=>{
    const p=puntos.get(e.pointerId);if(!p)return;
    const antes=puntos.size>1?pareja():null,nuevo=local(e),dx=nuevo.x-p.x,dy=nuevo.y-p.y;
    p.x=nuevo.x;p.y=nuevo.y;
    if(antes){
      const despues=pareja();
      if(antes.distancia>1&&despues.distancia>1)vista.acercar(despues.distancia/antes.distancia,antes.x,antes.y);
      vista.mover(despues.x-antes.x,despues.y-antes.y);cambio();
    }else{
      const previo=arrastrado;
      if(Math.hypot(p.x-p.inicioX,p.y-p.inicioY)>=UMBRAL_ARRASTRE)arrastrado=true;
      if(arrastrado){vista.mover(previo?dx:p.x-p.inicioX,previo?dy:p.y-p.inicioY);cambio();}
    }
    impedir(e);
  });
  escuchar('pointerup',e=>{
    const p=puntos.get(e.pointerId);if(!p)return;
    const fin=local(e);
    const pulsacion=puntos.size===1&&!multiple&&!arrastrado&&Math.hypot(fin.x-p.inicioX,fin.y-p.inicioY)<UMBRAL_ARRASTRE;
    puntos.delete(e.pointerId);soltar(e.pointerId);
    if(pulsacion&&fin.x>=0&&fin.y>=0&&fin.x<=vista.width&&fin.y<=vista.height){
      // Las etiquetas pueden ocupar bandas exteriores al mundo. Su selección
      // pertenece a la pantalla y conserva el destino consultado previamente.
      if(seleccion(fin)!==true){const lugar=vista.aMapa(fin.x,fin.y);if(lugar)consulta({lon:lugar.lon,lat:lugar.lat},fin);}
    }
    if(!puntos.size){arrastrado=false;multiple=false;}
    impedir(e);
  });
  function cancelar(e){
    if(!puntos.has(e.pointerId))return;
    puntos.delete(e.pointerId);arrastrado=true;multiple=true;soltar(e.pointerId);
    if(!puntos.size){arrastrado=false;multiple=false;}
  }
  escuchar('pointercancel',cancelar);escuchar('lostpointercapture',cancelar);
  escuchar('wheel',e=>{
    // La rueda habitual sigue desplazando la página, incluso sobre el mapa.
    if(!e.ctrlKey&&!e.metaKey)return;
    const p=local(e),unidad=e.deltaMode===1?16:e.deltaMode===2?vista.height:1;
    vista.acercar(Math.exp(limitar(-e.deltaY*unidad*.002,-3,3)),p.x,p.y);
    impedir(e);cambio();
  },{passive:false});
  escuchar('keydown',e=>{
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    switch(e.key){
      case '+':case '=':vista.acercar(1.5);break;
      case '-':case '_':vista.acercar(1/1.5);break;
      case 'ArrowLeft':vista.mover(vista.width*.15,0);break;
      case 'ArrowRight':vista.mover(-vista.width*.15,0);break;
      case 'ArrowUp':vista.mover(0,vista.height*.15);break;
      case 'ArrowDown':vista.mover(0,-vista.height*.15);break;
      case 'Home':vista.mundo();break;
      default:return;
    }
    impedir(e);cambio();
  });
  return function dispose(){
    if(desconectado)return;desconectado=true;
    for(const [tipo,fn,opts] of oyentes)canvas.removeEventListener(tipo,fn,opts);
    for(const id of puntos.keys())soltar(id);puntos.clear();
  };
}
const API={crear,conectar,ANCHO,ALTO,ZOOM_MAX};
if(typeof module!=='undefined'&&module.exports)module.exports=API;
if(root)root.AstroVista=API;
})(typeof window!=='undefined'?window:null);
