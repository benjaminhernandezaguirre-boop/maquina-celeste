(function(root){
"use strict";
const SIGNOS=['Aries','Tauro','Géminis','Cáncer','Leo','Virgo','Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'];
const grado=n=>{const m=Math.round(Math.abs(n)*60);return `${n<0?'−':''}${Math.floor(m/60)}°${String(m%60).padStart(2,'0')}′`;};
function crear(original,cfg){
  const L=root.NatalLectura,E=root.Efem,S=root.Escuelas,escuela=S.resuelve(cfg),c=L.preparar(original,cfg);
  const permite=id=>S.permite(cfg,id),lon=x=>L.longitud(c,x,cfg);
  const pos=x=>{const minutos=Math.floor(lon(x)*60)%21600;return `${SIGNOS[Math.floor(minutos/1800)]} ${grado((minutos%1800)/60)}`;};
  const nombre=id=>S.NOMBRE_DE_ID[id]||id,casa=x=>c.cusp?'Casa '+root.Casas.casaDe(x,c.cusp):'Sin hora';
  const etiqueta=x=>(x.glifo?x.glifo+' ':'')+(x.nombre||nombre(x.id));
  const secciones=[];
  const add=(id,titulo,criterio,columnas,filas,op={})=>{secciones.push({id,titulo,criterio,columnas,filas:filas.length?filas:[columnas.map((_,i)=>i?'—':'Sin resultados dentro de los criterios indicados.')],...op});};
  const altura=L.altura(c,'sol');
  add('configuracion','Configuración de lectura',escuela.encuadre,['Criterio','Selección'],[
    ['Escuela',escuela.nombrePerfil],['Zodiaco',escuela.nombreZodiaco+(escuela.sideral?' · ayanamsa '+grado(c.ayanamsa):'')],
    ['Casas',c.casasReal?.nombre||'Sin hora conocida'],['Población',escuela.poblacion==='siete'?'Siete planetas tradicionales':'Diez planetas'],
    ['Regencias',escuela.regencias],['Horizonte',altura==null?'Sin hora conocida':`Sol a ${grado(altura)} · carta ${c.diurna?'diurna':'nocturna'}`],
    ['Convención de horizonte','Centro solar geocéntrico aparente; horizonte geométrico, sin refracción. Altura ≥ 0°: diurna.'],
    ['Precisión','Motor astronómico aproximado. Conservar las limitaciones documentadas de las efemérides; el perfil de escuela no aumenta su precisión.'],
    ...(c.aviso?[['Sustitución de casas',c.aviso]]:[]),
    ['Métodos activos',Object.keys(S.METODOS).filter(id=>permite(id)&&S.METODOS[id].estado==='disponible').map(id=>S.METODOS[id].nombre).join(' · ')],
    ['Métodos complementarios',(S.perfilDe(escuela.perfil).metodosOpcionales||[]).filter(permite).map(id=>S.METODOS[id].nombre).join(' · ')||'Ninguno activado']
  ]);
  const posiciones=c.cuerpos.concat(c.puntos.filter(p=>p.id!=='lilith'||escuela.poblacion==='diez'));
  if(c.ang)posiciones.unshift({id:'asc',nombre:'Ascendente',glifo:'AC',lon:c.ang.asc},{id:'mc',nombre:'Medio Cielo',glifo:'MC',lon:c.ang.mc});
  add('posiciones','Posiciones de la carta','Posiciones en el zodiaco y las casas seleccionadas. Los puntos auxiliares no cuentan como planetas.',['Cuerpo o punto','Posición','Casa','Movimiento'],posiciones.map(x=>[etiqueta(x),pos(x.lon),casa(x.lon),x.retro?'Retrógrado':'—']),{ids:posiciones.map(x=>x.id)});
  if(escuela.complementaria){const extras=original.cuerpos.filter(x=>escuela.fuera.includes(x.id));add('complementarios','Capa complementaria','Se muestra fuera de la población principal; no interviene en balances, aspectos ni puntuaciones.',['Planeta','Posición','Casa'],extras.map(x=>[etiqueta(x),pos(x.lon),casa(x.lon)]));}
  const grupos=[['Elemento',['Fuego','Tierra','Aire','Agua'],4],['Modalidad',['Cardinal','Fija','Mutable'],3],['Polaridad',['Positiva','Negativa'],2]];
  add('balance','Elementos, modalidades y polaridades','Un voto por planeta del marco. Signos calculados en el zodiaco seleccionado.',['Grupo','Distribución','Cantidad','Planetas'],grupos.flatMap(([g,nombres,n])=>nombres.map((t,i)=>{const xs=c.cuerpos.filter(x=>Math.floor(lon(x.lon)/30)%n===i);return[g,t,`${xs.length} / ${c.cuerpos.length}`,xs.map(etiqueta).join(' · ')||'—'];})));
  const g=root.NatalGobierno.analizar({...c,cuerpos:original.cuerpos},cfg),reg=g.regenteAscendente,disp=g.dispositores;
  add('gobierno','Gobierno y prioridad','Regente, conjunción, angularidad, dispositor y dominancia son conceptos distintos. La prioridad usa únicamente los pesos declarados.',['Concepto','Resultado'],[
    ['Regente del Ascendente',reg.aplica?`${reg.regente} · rige ${reg.signoAscendente}`:reg.motivo],
    ['Conjunciones al Ascendente',g.conjuncionesAscendente.aplica?g.conjuncionesAscendente.lista.map(x=>`${x.nombre} · ${grado(x.orbe)} · ${x.lado}${x.complementario?' · complementario':''}`).join('\n')||'Ninguna a 10° o menos':g.conjuncionesAscendente.motivo],
    ['Proximidad a los ángulos',g.angularidad.aplica?g.angularidad.lista.map(x=>`${x.nombre} · ${x.corto} · ${grado(x.distancia)}${x.complementario?' · complementario':''}`).join('\n')||'Ninguna a 10° o menos':g.angularidad.motivo],
    ['Dispositores finales',disp.finales.map(x=>`${x.nombre} en ${x.signo}`).join(' · ')||'Ninguno'],
    ['Circuitos',disp.circuitos.map(x=>x.nombres.join(' → ')).join('\n')||'Ninguno'],
    ['Prioridad',g.dominancia.ganadores.map(x=>`${x.nombre}: ${x.puntos} puntos\n${x.razones.map(r=>`${r.criterio} +${r.puntos}`).join('; ')}`).join('\n\n')||'Sin resultado'],
    ['Pesos de prioridad','Regente del AC +3; ángulo hasta 5° +2, hasta 10° +1; dispositor final +2'+(permite('almutenFiguris')?'; almutén +2':'')+(permite('secta')?'; luminaria de secta +1':'')+'. Empates conservados.']
  ]);
  add('dispositores','Cadenas de dispositores','Regencias '+escuela.regencias+'. Se sigue el regente del signo hasta domicilio propio, circuito o ausencia de regente dentro de la población.',['Planeta','Signo','Dispositor','Cadena'],c.cuerpos.map(x=>[etiqueta(x),pos(x.lon),disp.disponeA[x.id]?nombre(disp.disponeA[x.id]):'Fuera de la población',disp.cadenas[x.id].camino.map(nombre).join(' → ')]),{ids:c.cuerpos.map(x=>x.id)});
  const siete=c.cuerpos.filter(x=>S.SIETE.includes(x.id)),sol=c.cuerpos.find(x=>x.id==='sol'),P=root.NatalProfesional;
  if(permite('secta'))add('secta','Secta y horizonte','La secta y el hemisferio se calculan con altura ecuatorial, nunca con el número de casa. Mercurio: fase oriental u occidental respecto al Sol.',['Planeta','Secta propia','Estado','Altura'],siete.map(x=>{const r=P.sectaPlaneta(x.id,x.lon,sol.lon,c.diurna,null),h=L.altura(c,x.id);return[etiqueta(x),r?.secta||'Sin hora',r?r.coincide?'En secta':'Fuera de secta':'Sin hora',h==null?'—':grado(h)];}));
  if(permite('dignidadesEsenciales'))add('esenciales','Dignidades esenciales','Domicilio y exaltación tradicionales; términos egipcios; triplicidades doroteanas; decanos caldeos. Se evalúan en el zodiaco de lectura. Sin hora se omite la triplicidad activa.'+(permite('puntuacionLilly')?' Puntos: +5, +4, +3, +2, +1; exilio −5 y caída −4.':' Se muestran dignidades y debilidades sin un total de Lilly.'),['Planeta','Posición','Dignidades y debilidades',...(permite('puntuacionLilly')?['Total']:[])],siete.map(x=>{const r=P.dignidadesEsenciales(x.id,lon(x.lon),c.diurna);return[etiqueta(x),pos(x.lon),r.detalles.map(d=>d.label).join(' · '),...(permite('puntuacionLilly')?[String(r.puntos)]:[])];}));
  if(permite('dignidadesAccidentales'))add('accidentales','Condición accidental',permite('puntuacionLilly')?'Ponderación de Lilly por casa, movimiento y condición solar. Los componentes se presentan por separado.':'Condición descriptiva por casa, movimiento y relación solar; sin aplicar totales de Lilly en este perfil.',['Planeta','Casa y movimiento','Condición solar',...(permite('puntuacionLilly')?['Componentes y total']:[])],siete.map(x=>{const cs=c.cusp?.map(v=>v==null?v:L.mod(v-c.ayanamsa)),r=P.dignidadesAccidentales(x.id,lon(x.lon),{cuspides:cs,solLon:lon(sol.lon),ms:c.ms,E,retro:x.retro});return[etiqueta(x),`${casa(x.lon)} · ${r.movimiento.retro?'retrógrado':'directo'} · ${r.movimiento.ritmo}`,`${r.solar.label} · ${grado(r.solar.separacion)}`,...(permite('puntuacionLilly')?[r.detalles.map(d=>`${d.label}: ${d.puntos}`).join('\n')+`\nTotal: ${r.puntos}`]:[])];}));
  if(permite('almutenFiguris'))add('almuten','Almutén figuris','Ibn Ezra: cinco puntos hylegiacales, puntuación por las casas seleccionadas y regentes del día y hora. Los puntos zodiacales usan el zodiaco seleccionado; las horas planetarias conservan el horizonte astronómico.',['Planeta','Esenciales','Accidentales','Total'],g.almuten.aplica?g.almuten.tabla.map(x=>[x.planeta,String(x.esencial),String(x.accidental),String(x.total)]):[[g.almuten.motivo,'—','—','—']]);
  if(c.cusp){
    add('casas','Casas y distribución','Las casas respetan el sistema elegido. Una casa angular no equivale necesariamente a proximidad por grados a un ángulo.',['Casa','Cúspide','Regente','Planetas'],Array.from({length:12},(_,i)=>{const n=i+1;return[String(n),pos(c.cusp[n]),nombre(L.regente(c,c.cusp[n],cfg)),c.cuerpos.filter(x=>root.Casas.casaDe(x.lon,c.cusp)===n).map(etiqueta).join(' · ')||'—'];}));
    const hemis=c.cuerpos.map(x=>({...x,altura:L.altura(c,x.id)}));
    add('estructura','Cuadrantes, hemisferios y angularidad','Cuadrantes y angularidad por casas; hemisferios superior e inferior por horizonte geométrico.',['Zona','Planetas'],[
      ...Array.from({length:4},(_,i)=>['Cuadrante '+(i+1),c.cuerpos.filter(x=>Math.floor((root.Casas.casaDe(x.lon,c.cusp)-1)/3)===i).map(etiqueta).join(' · ')||'—']),
      ['Sobre el horizonte',hemis.filter(x=>x.altura>=0).map(etiqueta).join(' · ')||'—'],['Bajo el horizonte',hemis.filter(x=>x.altura<0).map(etiqueta).join(' · ')||'—'],
      ...[['Angulares',[1,4,7,10]],['Sucedentes',[2,5,8,11]],['Cadentes',[3,6,9,12]]].map(([n,casas])=>[n,c.cuerpos.filter(x=>casas.includes(root.Casas.casaDe(x.lon,c.cusp))).map(etiqueta).join(' · ')||'—'])]);
  }
  const testigos=[sol,c.cuerpos.find(x=>x.id==='luna')];if(c.ang)testigos.push({id:'asc',nombre:'Ascendente',lon:c.ang.asc},c.cuerpos.find(x=>x.id===reg.id));
  const temps=['Colérico','Melancólico','Sanguíneo','Flemático'];
  add('temperamento','Temperamento descriptivo','Modelo simplificado de cuatro testigos con igual peso: Sol, Luna, Ascendente y su regente según el marco. No se presenta como un juicio temperamental histórico completo.',['Testigo','Posición','Elemento','Temperamento'],testigos.filter(Boolean).map(x=>{const i=Math.floor(lon(x.lon)/30)%4;return[etiqueta(x),pos(x.lon),grupos[0][1][i],temps[i]];}));
  const rel=root.NatalRelaciones.analizar(c,E);
  add('aspectos','Aspectos y dinámica',rel.criterio.dinamica+' '+rel.criterio.fuerza,['Planetas','Aspecto','Orbe','Estado'],rel.dinamicos.map(x=>[`${etiqueta(x.A)} · ${etiqueta(x.B)}`,x.aspecto.n||x.aspecto.nombre,grado(x.aspecto.dif),x.estado]));
  if(permite('patrones')){const girada={...c,cuerpos:c.cuerpos.map(x=>({...x,lon:lon(x.lon)})),cusp:c.cusp?.map(x=>x==null?x:lon(x))};const p=root.NatalPatrones.analizar(girada);add('patrones','Patrones y concentraciones',p.criterio.stellium+' '+p.criterio.forma,['Configuración','Planetas o alcance'],[['Forma: '+p.forma.nombre,p.forma.descripcion],...p.patrones.map(x=>[x.nombre,x.cuerpos.map(etiqueta).join(' · ')])]);}
  if(permite('declinaciones'))add('declinaciones','Paralelos y límites de declinación',rel.criterio.declinacion,['Referencia','Relación','Orbe o exceso'],[...rel.declinacion.contactos.map(x=>[`${etiqueta(x.A)} · ${etiqueta(x.B)}`,x.tipo,grado(x.orbe)]),...rel.declinacion.fueraLimites.map(x=>[etiqueta(x),'Fuera de límites'+(x.limitrofe?' · limítrofe':''),grado(x.exceso)])]);
  if(permite('antiscios'))add('antiscios','Antiscios y contraantiscios',rel.criterio.antiscios+' La reflexión mantiene el eje solsticial tropical aunque se muestre en sideral.',['Planetas','Relación','Punto','Orbe'],rel.antiscios.map(x=>[`${etiqueta(x.A)} · ${etiqueta(x.B)}`,x.tipo,pos(x.punto),grado(x.orbe)]));
  if(permite('puntosMedios'))add('puntos-medios','Puntos medios',rel.criterio.puntosMedios,['Par','Tercer planeta','Punto medio','Contacto'],rel.puntosMedios.map(x=>[`${etiqueta(x.A)} · ${etiqueta(x.B)}`,etiqueta(x.C),pos(x.punto),`${x.tipo} · ${grado(x.orbe)}`]));
  const luz=root.NatalLuminarias.analizar(c,E),sz=luz.sizigia;
  add('luminarias','Luminarias y lunación prenatal',luz.criterio.sizigia+' '+luz.criterio.aspectos,['Referencia','Resultado'],[
    ['Fase natal',`${luz.fase.nombre} · ${luz.fase.iluminacion.toFixed(1)} % · ${luz.fase.edadDias.toFixed(2)} días desde la Luna nueva`],
    ['Sizigia',`${sz.tipo} · ${new Date(sz.ms).toISOString()} UTC · ${pos(sz.referenciaLon)} · ${casa(sz.referenciaLon)}`],
    ['Regente de la sizigia',nombre(L.regente(c,sz.referenciaLon,cfg))],
    ...sz.aspectos.map(x=>[etiqueta(x.referencia),`${x.aspecto.nombre} · orbe ${grado(x.aspecto.diferencia)}`])]);
  if(permite('estrellasFijas')){const es=root.NatalEstrellas.analizar(c,E);add('estrellas','Estrellas fijas',es.criterio.contacto+' '+es.criterio.limite,['Estrella','Posición','Contacto natal','Orbe'],es.contactos.map(x=>[x.estrella.nombre,pos(x.estrella.lon),etiqueta(x.referencia),grado(x.diferencia)]));}
  const puntos=root.NatalPuntos.analizar({...c,puntos:c.puntos.filter(x=>x.id!=='lilith'||escuela.poblacion==='diez')});
  add('puntos','Ejes y puntos sensibles','Las regencias siguen el zodiaco y el marco seleccionados. Fortuna usa el horizonte solar; no cuenta como planeta.',['Punto','Posición','Casa','Regente'],puntos.puntos.map(x=>[x.nombre,pos(x.lon),casa(x.lon),nombre(L.regente(c,x.lon,cfg))]));
  add('sintesis','Síntesis y orden de lectura','Resumen de los mismos resultados mostrados arriba. No se mezclan puntuaciones o técnicas excluidas del perfil.',['Paso','Lectura'],[
    ['1 · Regente',reg.aplica?`Comenzar con ${reg.regente}, regente del Ascendente en ${reg.signoAscendente}.`:'Sin hora: no se asigna regente del Ascendente.'],
    ['2 · Protagonismo',g.dominancia.ganadores.map(x=>`${x.nombre}: ${x.razones.map(y=>y.criterio).join('; ')}`).join('\n')||'Sin prioridad única'],
    ['3 · Disposiciones',disp.finales.map(x=>x.nombre+' en domicilio').join(' · ')||'Revisar circuitos y cadenas completas.'],
    ['4 · Aspectos',`${rel.resumen.aplicativos} aplicativos; ${rel.resumen.separativos} separativos. Contrastar con posiciones y orbes.`],
    ['5 · Luminarias',`${luz.fase.nombre}; integrar la sizigia prenatal y sus contactos.`],
    ...(g.almuten.aplica?[['Almutén',g.almuten.tabla.filter(x=>x.total===g.almuten.ganador.total).map(x=>`${x.planeta}: ${x.total} puntos`).join(' · ')]]:[]),
    ['Alcance',c.ang?'Integrar casas y proximidad a los ángulos.':'Carta sin hora: ángulos, casas, secta y Fortuna permanecen sin calcular.']
  ]);
  return {escuela,carta:c,secciones,nombre:c.datos.nombre||'Carta sin nombre',fecha:c.datos.resumenFecha||new Date(c.ms).toISOString(),lugar:c.datos.lugarTexto||'',huso:c.datos.husoTexto||c.datos.tz||''};
}
root.NatalInforme={crear,grado};
})(typeof window!=='undefined'?window:globalThis);
