(function(root){
"use strict";
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function pantalla(destino,informe,seleccionar,resaltarCuadrante){
  const esc=informe.escuela;
  destino.innerHTML=`<section class="lectura-portada"><span class="lectura-ceja">Carta natal · modo avanzado</span><h2>${escape(esc.nombrePerfil)}</h2><p>Una lectura de ${esc.poblacion==='siete'?'siete':'diez'} planetas. Cada sección muestra su método y los resultados del marco seleccionado.</p><nav aria-label="Secciones de esta escuela">${informe.secciones.map(s=>`<button type="button" data-seccion="${s.id}">${escape(s.titulo)}</button>`).join('')}</nav></section>`+
    informe.secciones.map((s,i)=>`<details class="lectura-seccion" id="lectura-${s.id}" ${i<4?'open':''}><summary><span>${String(i+1).padStart(2,'0')}</span><h3>${escape(s.titulo)}</h3></summary><p class="lectura-criterio">${escape(s.criterio)}</p><div class="lectura-tabla" tabindex="0" role="region" aria-label="${escape(s.titulo)}"><table><thead><tr>${s.columnas.map(c=>`<th scope="col">${escape(c)}</th>`).join('')}</tr></thead><tbody>${s.filas.map((r,j)=>`<tr>${r.map((c,k)=>`<td>${k===0&&s.ids?.[j]?`<button type="button" data-planeta="${s.ids[j]}">${escape(c)}</button>`:escape(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`).join('');
  destino.querySelectorAll('[data-seccion]').forEach(b=>b.addEventListener('click',()=>{const d=destino.querySelector('#lectura-'+b.dataset.seccion);d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}));
  destino.querySelectorAll('[data-planeta]').forEach(b=>b.addEventListener('click',()=>seleccionar(b.dataset.planeta)));
  const estructura=informe.secciones.find(s=>s.id==='estructura'),panel=destino.querySelector('#lectura-estructura');
  if(estructura&&panel){
    panel.querySelector('.lectura-criterio').insertAdjacentHTML('afterend',`<div class="cuadrantes-diagrama lectura-cuadrantes">${estructura.filas.slice(0,4).map((r,i)=>`<button type="button" class="cuadrante" data-cuadrante="${i+1}" aria-pressed="false"><b>${escape(r[0])}</b><span>Casas ${i*3+1}–${i*3+3}</span><small>${escape(r[1])}</small></button>`).join('')}</div>`);
    panel.querySelectorAll('[data-cuadrante]').forEach(b=>b.addEventListener('click',()=>{const q=resaltarCuadrante?.(Number(b.dataset.cuadrante));panel.querySelectorAll('[data-cuadrante]').forEach(x=>x.setAttribute('aria-pressed',String(Number(x.dataset.cuadrante)===q)));}));
  }
}
function lineas(g,txt,ancho){
  const out=[];
  for(const p of String(txt??'').split('\n')){
    let linea='';for(const palabra of p.split(/\s+/).filter(Boolean)){
      if(g.measureText((linea?linea+' ':'')+palabra).width<=ancho){linea+=(linea?' ':'')+palabra;continue;}
      if(linea){out.push(linea);linea='';}
      for(const letra of palabra){if(g.measureText(linea+letra).width>ancho&&linea){out.push(linea);linea='';}linea+=letra;}
    }out.push(linea);
  }return out;
}
function plan(informe){
  const g=document.createElement('canvas').getContext('2d');g.font='26px Spectral, Georgia, serif';
  const paginas=[];
  for(const s of informe.secciones){
    const n=s.columnas.length,anchos=n===2?[390,1042]:n===3?[420,506,506]:[300,350,382,400];
    const nota=lineas(g,s.criterio,1432),top=330+nota.length*35+30;
    let pagina={tipo:'tabla',seccion:s,anchos,nota,top,filas:[]},y=top+62;
    const nueva=()=>{paginas.push(pagina);pagina={tipo:'tabla',seccion:s,anchos,nota,top,filas:[],continuacion:true};y=top+62;};
    for(const r of s.filas){
      const celdas=r.map((t,i)=>{g.font=(i===0?"600 ":"")+"26px Spectral, Georgia, serif";return lineas(g,t,anchos[i]-36);});let pendiente=Math.max(...celdas.map(x=>x.length)),offset=0;
      while(pendiente>0){
        let capacidad=Math.floor((2090-y-38)/35);
        if(capacidad<1){nueva();continue;}
        if(pendiente>capacidad&&offset===0&&pagina.filas.length){nueva();continue;}
        const toma=Math.min(pendiente,capacidad),alto=toma*35+38;
        pagina.filas.push({y,alto,celdas:celdas.map(c=>c.slice(offset,offset+toma))});
        y+=alto;offset+=toma;pendiente-=toma;if(pendiente)nueva();
      }
    }
    paginas.push(pagina);
    if(s.id==='configuracion')paginas.push({tipo:'rueda',seccion:{titulo:'Carta natal · '+informe.escuela.nombrePerfil}});
  }
  return paginas;
}
function lienzos(informe,dibujarRueda){
  const paginas=plan(informe),total=paginas.length;
  return paginas.map((p,i)=>{
    const c=document.createElement('canvas');c.width=1600;c.height=2263;const g=c.getContext('2d');
    g.fillStyle='#F5F0E5';g.fillRect(0,0,c.width,c.height);g.textAlign='left';g.textBaseline='alphabetic';
    g.fillStyle='#80601D';g.font='600 18px "IBM Plex Mono", monospace';g.fillText('ASTROPLANETARIO · INFORME NATAL',84,84);
    g.textAlign='right';g.fillText(`HOJA ${i+1} / ${total}`,1516,84);g.textAlign='left';
    g.fillStyle='#25232B';g.font='35px Cinzel, Georgia, serif';
    const titulo=lineas(g,p.seccion.titulo+(p.continuacion?' · continuación':''),1432);titulo.forEach((l,j)=>g.fillText(l,84,143+j*43));
    g.font='22px Spectral, Georgia, serif';g.fillText(informe.nombre,84,224);
    g.font='19px Spectral, Georgia, serif';lineas(g,`${informe.fecha} · ${informe.lugar} · ${informe.huso}`,1432).forEach((l,j)=>g.fillText(l,84,254+j*25));
    if(p.tipo==='rueda'){
      g.save();dibujarRueda(g,800,1060,640);g.restore();
      g.textAlign='left';g.textBaseline='alphabetic';
      g.fillStyle='#514A40';g.font='24px Spectral, Georgia, serif';
      const texto=`${informe.escuela.nombreZodiaco} · ${informe.carta.casasReal?.nombre||'Sin casas'} · regencias ${informe.escuela.regencias}. Los datos identificativos se conservan en el encabezado; el centro queda libre para leer los aspectos.`;
      lineas(g,texto,1400).forEach((l,j)=>g.fillText(l,100,1870+j*34));
    }else{
      g.font='26px Spectral, Georgia, serif';g.fillStyle='#5A5144';p.nota.forEach((l,j)=>g.fillText(l,84,324+j*35));
      g.fillStyle='#DFD1B6';g.fillRect(84,p.top,1432,62);g.fillStyle='#423A2C';g.font='600 22px Spectral, Georgia, serif';
      let x=84;p.seccion.columnas.forEach((t,j)=>{g.fillText(t,x+18,p.top+39);x+=p.anchos[j];});
      for(const [r,f] of p.filas.entries()){
        g.fillStyle=r%2?'#EDE5D5':'#F5F0E5';g.fillRect(84,f.y,1432,f.alto);g.strokeStyle='#CFC1A7';g.lineWidth=1;
        g.beginPath();g.moveTo(84,f.y+f.alto);g.lineTo(1516,f.y+f.alto);g.stroke();
        x=84;f.celdas.forEach((ls,j)=>{g.fillStyle=j===0?'#3D403E':'#25232B';g.font=(j===0?'600 ':'')+'26px Spectral, Georgia, serif';ls.forEach((l,k)=>g.fillText(l,x+18,f.y+38+k*35));x+=p.anchos[j];});
      }
    }
    g.strokeStyle='#CFC1A7';g.beginPath();g.moveTo(84,2146);g.lineTo(1516,2146);g.stroke();
    g.fillStyle='#61594D';g.font='17px Spectral, Georgia, serif';g.fillText('astroplanetario.com · Instituto de Artes Esotéricas y Saberes Ancestrales',84,2194);
    g.textAlign='right';g.font='18px "IBM Plex Mono", monospace';g.fillText(`${i+1} / ${total}`,1516,2194);
    return c;
  });
}
root.NatalInformeUI={pantalla,lineas,plan,lienzos};
})(typeof window!=='undefined'?window:globalThis);
