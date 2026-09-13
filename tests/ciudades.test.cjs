const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const contexto={console,Date,Intl,Math};
contexto.window=contexto;
contexto.globalThis=contexto;
vm.runInNewContext(fs.readFileSync('app/ciudades.js','utf8'),contexto,{filename:'app/ciudades.js'});
vm.runInNewContext(fs.readFileSync('app/efemerides.js','utf8'),contexto,{filename:'app/efemerides.js'});

const C=contexto.Ciudades,lista=C.lista;
assert.ok(lista.length>=2900,'el catálogo debe superar 2 900 ciudades');
assert.equal(contexto.Efem.CIUDADES,lista,'efemérides debe reutilizar el catálogo compartido');
assert.equal(new Set(lista.map(c=>C.normaliza(c.etiqueta))).size,lista.length,'no debe haber etiquetas duplicadas');

for(const c of lista){
  assert.ok(c.n&&c.r&&c.etiqueta,'cada ciudad debe tener nombre, región y etiqueta');
  assert.ok(Number.isFinite(c.lat)&&c.lat>=-90&&c.lat<=90,`latitud inválida: ${c.etiqueta}`);
  assert.ok(Number.isFinite(c.lon)&&c.lon>=-180&&c.lon<=180,`longitud inválida: ${c.etiqueta}`);
  assert.doesNotThrow(()=>new Intl.DateTimeFormat('es',{timeZone:c.tz}),`zona inválida: ${c.etiqueta}`);
}

for(const nombre of ['Tepatitlán de Morelos','Tulum','Puerto Escondido','Minatitlán']){
  const r=C.resolver(nombre);
  assert.ok(r.ciudad&&/México|MX/.test(r.ciudad.r),`debe encontrar ${nombre}`);
}
assert.equal(C.resolver('queretaro').ciudad.n,'Querétaro','la búsqueda debe ignorar acentos');
assert.equal(C.resolver('Córdoba').ambiguas,true,'los nombres repetidos deben pedir región y país');
assert.ok(lista.filter(c=>/México|, MX$/.test(c.r)).length>=600,'México debe tener cobertura amplia');

console.log(`ciudades: ${lista.length} registros correctos`);

