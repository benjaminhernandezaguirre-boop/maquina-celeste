/* ===================== Esferas con textura =====================
   Envuelve el mapa plano de cada planeta —un rectángulo con toda la superficie
   desenrollada, el doble de ancho que de alto— sobre una bola que gira.

   Cómo: para cada píxel del disco se calcula el punto de la esfera que le
   corresponde y de ahí la latitud y la longitud, que dicen qué píxel de la
   textura hay que copiar. Ese mapeo no cambia nunca mientras el radio sea el
   mismo, así que se calcula una sola vez y se guarda; girar el planeta es
   entonces sumar un desplazamiento a la longitud, sin un solo seno por fotograma.

   La inclinación del eje no entra en ese mapeo —lo rompería— sino que se aplica
   girando el disco ya dibujado, que para una esfera es exactamente lo mismo. Por
   eso Urano se ve rodando de lado y Venus girando al revés, que es como van.

   Texturas: Solar System Scope (CC BY 4.0), hechas sobre imágenes de la NASA;
   Plutón, de la NASA/JPL. */
(() => {
"use strict";
const RUTA = "assets/planetas/";

/* periodo de rotación en días (negativo = retrógrado) e inclinación del eje */
const CUERPOS = {
  sol:      {t:"sol",      rot:  25.38,   eje:   7.25},
  mercurio: {t:"mercurio", rot:  58.646,  eje:   0.03},
  venus:    {t:"venus",    rot:-243.025,  eje: 177.36},
  tierra:   {t:"tierra",   rot:   0.99727,eje:  23.44, noche:"tierra-noche"},
  luna:     {t:"luna",     rot:  27.3217, eje:   6.68},
  marte:    {t:"marte",    rot:   1.02596,eje:  25.19},
  jupiter:  {t:"jupiter",  rot:   0.41354,eje:   3.13},
  saturno:  {t:"saturno",  rot:   0.44401,eje:  26.73, anillo:"saturno-anillo"},
  urano:    {t:"urano",    rot:  -0.71833,eje:  97.77},
  neptuno:  {t:"neptuno",  rot:   0.67125,eje:  28.32},
  pluton:   {t:"pluton",   rot:  -6.3872, eje: 122.53}
};

/* --- las texturas, leídas una vez a memoria de píxeles --- */
const texturas = new Map();
function cargaTextura(nombre){
  if(texturas.has(nombre)) return texturas.get(nombre);
  const reg = {lista:false, ancho:0, alto:0, datos:null};
  texturas.set(nombre, reg);
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext("2d", {willReadFrequently:true});
    g.drawImage(img, 0, 0);
    try {
      const d = g.getImageData(0, 0, c.width, c.height);
      reg.datos = d.data; reg.ancho = c.width; reg.alto = c.height; reg.lista = true;
      if(typeof reg.alLlegar === "function") reg.alLlegar();
    } catch(e){ /* si el navegador no deja leer los píxeles, se queda el dibujo de siempre */ }
  };
  img.src = RUTA + nombre + ".webp";
  return reg;
}

/* --- el mapeo píxel→esfera, que sólo depende del radio --- */
const mapas = new Map();
function mapaDe(r){
  const clave = r|0;
  if(mapas.has(clave)) return mapas.get(clave);
  const lado = clave*2, n = lado*lado;
  const col = new Float32Array(n), fila = new Float32Array(n);
  const nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n);
  const dentro = new Uint8Array(n), borde = new Uint8Array(n);   // borde = cuánto cubre el píxel
  for(let py = 0; py < lado; py++){
    const y = (py + 0.5)/clave - 1;
    for(let px = 0; px < lado; px++){
      const i = py*lado + px, x = (px + 0.5)/clave - 1;
      const q = x*x + y*y;
      if(q >= 1) continue;
      const z = Math.sqrt(1 - q);
      dentro[i] = 1; nx[i] = x; ny[i] = y; nz[i] = z;
      const cob = (1 - Math.sqrt(q))*clave + 0.5;   // suaviza el filo del disco
      borde[i] = cob >= 1 ? 255 : (cob <= 0 ? 0 : (cob*255)|0);
      col[i] = Math.atan2(x, z)/(2*Math.PI);          // longitud, en vueltas
      fila[i] = (Math.asin(-y) + Math.PI/2)/Math.PI;  // latitud, de 0 (norte) a 1 (sur)
    }
  }
  const m = {lado, col, fila, nx, ny, nz, dentro, borde, img:null};
  if(mapas.size > 40) mapas.clear();                  // no acumular radios viejos
  mapas.set(clave, m);
  return m;
}

/* --- dibuja una esfera con textura --- */
/* op: {giro (vueltas), luz:[x,y,z] normalizada, ambiente, noche:true,
        modoNoche:true para mostrar el mapa nocturno completo de la Tierra} */
function pintaEsfera(g, id, cx, cy, r, op){
  const c = CUERPOS[id];
  if(!c || r < 2) return false;
  op = op || {};
  const modoNoche = Boolean(c.noche && op.modoNoche);
  const tex = cargaTextura(modoNoche ? c.noche : c.t);
  if(!tex.lista) return false;
  const noche = (!modoNoche && c.noche && op.noche !== false) ? cargaTextura(c.noche) : null;
  const usaNoche = noche && noche.lista;

  const m = mapaDe(r), lado = m.lado;
  if(!m.img) m.img = g.createImageData(lado, lado);
  const salida = m.img;
  const s = salida.data, td = tex.datos, tw = tex.ancho, th = tex.alto;
  const nd = usaNoche ? noche.datos : null;
  const nw = usaNoche ? noche.ancho : 0, nh = usaNoche ? noche.alto : 0;
  const giro = op.giro || 0;
  const lx = op.luz ? op.luz[0] : -0.45, ly = op.luz ? op.luz[1] : -0.42, lz = op.luz ? op.luz[2] : 0.79;
  const amb = op.ambiente == null ? (modoNoche ? 0.72 : 0.13) : op.ambiente;
  const exposicion = modoNoche ? 2.2 : 1;
  const propio = id === "sol";                        // el Sol no lo ilumina nadie

  for(let i = 0; i < lado*lado; i++){
    if(!m.dentro[i]) continue;
    let u = m.col[i] + giro; u -= Math.floor(u);
    const sx = (u*tw)|0, sy = (m.fila[i]*th)|0;
    const k = ((sy < th ? sy : th-1)*tw + (sx < tw ? sx : tw-1))*4;
    const j = i*4;
    let luz = propio ? 1 : m.nx[i]*lx + m.ny[i]*ly + m.nz[i]*lz;
    if(luz < 0) luz = 0;
    const dia = propio ? 1 : amb + (1-amb)*luz;
    if(usaNoche && luz < 0.22){                       // el lado de noche: luces de ciudad
      const mez = luz/0.22;
      const sx2 = (u*nw)|0, sy2 = (m.fila[i]*nh)|0;
      const k2 = ((sy2 < nh ? sy2 : nh-1)*nw + (sx2 < nw ? sx2 : nw-1))*4;
      const bn = 0.55*(1-mez);
      s[j]   = td[k]  *dia + nd[k2]  *bn;
      s[j+1] = td[k+1]*dia + nd[k2+1]*bn;
      s[j+2] = td[k+2]*dia + nd[k2+2]*bn;
    } else {
      s[j]   = Math.min(255, td[k]  *dia*exposicion);
      s[j+1] = Math.min(255, td[k+1]*dia*exposicion);
      s[j+2] = Math.min(255, td[k+2]*dia*exposicion);
    }
    s[j+3] = m.borde[i];
  }

  g.save();
  g.translate(cx, cy);
  g.rotate((c.eje > 90 ? c.eje - 180 : c.eje) * Math.PI/180);   // inclinación del eje
  const tmp = pizarra(lado);
  tmp.g.putImageData(salida, 0, 0);
  g.drawImage(tmp.c, -r, -r);
  g.restore();
  return true;
}

/* lienzo auxiliar reutilizado, para no crear uno por fotograma */
let _piz = null;
function pizarra(lado){
  if(!_piz || _piz.c.width < lado){
    const c = document.createElement("canvas");
    c.width = c.height = lado;
    _piz = {c, g: c.getContext("2d")};
  }
  _piz.g.clearRect(0, 0, _piz.c.width, _piz.c.height);
  return _piz;
}

/* --- los anillos de Saturno: el mapa es un perfil radial --- */
function pintaAnillo(g, cx, cy, r, op){
  const t = cargaTextura(CUERPOS.saturno.anillo);
  if(!t.lista) return false;
  op = op || {};
  const incl = op.incl == null ? 0.34 : op.incl;      // cuánto se ve el plano de canto
  const gir  = op.giroPlano == null ? -0.34 : op.giroPlano;
  const rInt = r*1.24, rExt = r*2.27;
  const pasos = 110, td = t.datos, tw = t.ancho;
  const alfa = op.alfa == null ? 0.92 : op.alfa;

  g.save();
  if(op.frente){
    /* La parte del anillo que tapa al planeta es la mitad cercana, y sólo donde
       cae sobre el disco. Recortar por una raya horizontal dejaba un corte recto
       en las asas, y repintar lo de fuera acumulaba transparencias y dejaba la
       mitad de abajo más clara que la de arriba. Se recorta por las dos cosas. */
    g.beginPath(); g.arc(cx, cy, r*1.005, 0, Math.PI*2); g.clip();
    g.save(); g.translate(cx, cy); g.rotate(gir);
    g.beginPath(); g.rect(-rExt*1.2, 0, rExt*2.4, rExt*1.4);
    g.restore();
    g.clip();
  }
  g.translate(cx, cy);
  g.rotate(gir);
  g.scale(1, Math.max(0.04, incl));
  for(let i = 0; i < pasos; i++){
    const f0 = i/pasos, f1 = (i+1)/pasos;
    const k = (((f0*(tw-1))|0)*4);
    const a = td[k+3]/255;
    if(a < 0.02) continue;
    const R0 = rInt + (rExt-rInt)*f0, R1 = rInt + (rExt-rInt)*f1;
    g.beginPath();
    g.arc(0, 0, R1, 0, Math.PI*2);
    g.moveTo(R0, 0);                                  // sin esto queda una raya radial
    g.arc(0, 0, R0, 0, Math.PI*2, true);
    g.fillStyle = `rgba(${td[k]},${td[k+1]},${td[k+2]},${a*alfa})`;
    g.fill();
  }
  g.restore();
  return true;
}

/* cuántas vueltas lleva dadas un planeta en un instante dado */
function giroDe(id, ms, aceleracion){
  const c = CUERPOS[id];
  if(!c) return 0;
  const dias = (ms/86400000) * (aceleracion || 1);
  return dias / c.rot;
}

/* La portada cambia de aspecto según el reloj local del visitante. */
function tierraDeNoche(ms){
  const hora = new Date(ms == null ? Date.now() : ms).getHours();
  return hora >= 19 || hora < 7;
}

window.Planetas = {CUERPOS, pintaEsfera, pintaAnillo, giroDe, cargaTextura,
                   tierraDeNoche,
                   listo: id => CUERPOS[id] && cargaTextura(CUERPOS[id].t).lista};
})();

