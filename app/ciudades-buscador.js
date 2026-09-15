/* Datalist compartido: consulta solo con texto, hasta 40 resultados y descarte
   de respuestas antiguas. Una entrada vacía no inicia Worker ni red. */
(function(root){
'use strict';
const TOPE=40,MINIMO=1,conectados=new Set(),estados=new WeakMap();
const C=()=>root.Ciudades;
const normaliza=t=>C().normaliza(t);
function conecta(id='ciudades'){
  if(conectados.has(id))return;conectados.add(id);
  const selector='input[list="'+id+'"]';let version=0,temporizador,activo=null;
  function estado(input,texto){
    let nodo=estados.get(input);
    if(!nodo){
      nodo=document.createElement('small');nodo.id='ciudad-estado-'+id+'-'+(document.querySelectorAll('[data-ciudad-estado]').length+1);
      nodo.dataset.ciudadEstado='';nodo.setAttribute('role','status');nodo.setAttribute('aria-live','polite');
      nodo.style.cssText='display:block;font-size:.75rem;line-height:1.4;margin-top:.3rem;color:inherit';
      input.insertAdjacentElement('afterend',nodo);estados.set(input,nodo);
      input.setAttribute('aria-describedby',((input.getAttribute('aria-describedby')||'')+' '+nodo.id).trim());
    }
    nodo.textContent=texto;input.setAttribute('aria-busy',String(texto.startsWith('Cargando')||texto==='Buscando…'));
  }
  function atiende(input,alFoco){
    const dl=document.getElementById(id);if(!dl)return;
    if(activo&&activo!==input)estado(activo,'');activo=input;
    const turno=++version;clearTimeout(temporizador);dl.replaceChildren();
    const texto=input.value;
    if(normaliza(texto).length<MINIMO){estado(input,'Escribe una ciudad; puedes añadir región o país.');return;}
    const seleccion=C().resolver?.(texto)?.ciudad;
    if(seleccion&&normaliza(seleccion.etiqueta)===normaliza(texto)){
      const opcion=document.createElement('option');opcion.value=seleccion.etiqueta;dl.appendChild(opcion);
      estado(input,'Localidad seleccionada.');return;
    }
    estado(input,'Buscando…');
    const consulta=async()=>{
      try{
        await C().carga();if(turno!==version||texto!==input.value)return;
        estado(input,'Buscando…');const resultados=await C().buscar(texto);
        if(turno!==version||texto!==input.value)return;
        const frag=document.createDocumentFragment();for(const c of resultados.slice(0,TOPE)){const o=document.createElement('option');o.value=c.etiqueta;frag.appendChild(o);}dl.replaceChildren(frag);
        estado(input,resultados.length?'Elige la ciudad con su región y país.':'No se encontraron coincidencias. Prueba otro nombre o usa coordenadas manuales.');
      }catch(e){if(turno===version){dl.replaceChildren();estado(input,e.message+' Toca el campo para reintentar.');}}
    };
    if(alFoco)consulta();else temporizador=setTimeout(consulta,140);
  }
  document.addEventListener('input',e=>{if(e.target.matches?.(selector))atiende(e.target,false);});
  document.addEventListener('focusin',e=>{if(e.target.matches?.(selector))atiende(e.target,true);});
}
root.CiudadesBuscador={TOPE,MINIMO,carga:()=>C().carga(),listo:()=>C().listo(),coincidencias:t=>C().buscar(t),normaliza,conecta};
})(typeof window!=='undefined'?window:globalThis);
