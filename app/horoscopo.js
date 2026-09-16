(function(root){
  'use strict';
  function estadoEdicion(inicio,fin,fecha=new Date(),zona='America/Mexico_City'){
    const partes=new Intl.DateTimeFormat('en-CA',{timeZone:zona,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(fecha);
    const valores=Object.fromEntries(partes.map(p=>[p.type,p.value]));
    const hoy=`${valores.year}-${valores.month}-${valores.day}`;
    return hoy<inicio?'proxima':hoy>fin?'anterior':'actual';
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={estadoEdicion};return;}
  const etiquetas={actual:'Semana en curso',anterior:'Edición anterior · consulta sus fechas',proxima:'Próxima edición · consulta sus fechas'};
  function actualizar(){
    root.document.querySelectorAll('[data-edicion-inicio]').forEach(el=>{
      const estado=estadoEdicion(el.dataset.edicionInicio,el.dataset.edicionFin,new Date(),el.dataset.edicionZona);
      el.dataset.estado=estado;el.textContent=etiquetas[estado];
    });
  }
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',actualizar,{once:true});else actualizar();
  root.addEventListener('pageshow',actualizar);
  root.document.addEventListener('visibilitychange',()=>{if(!root.document.hidden)actualizar();});
  root.setInterval(actualizar,60000);
})(typeof window!=='undefined'?window:globalThis);
