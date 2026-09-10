const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../astroplanetario.html'),'utf8');
const source=html.slice(html.indexOf('function pintaBalance(){'),html.indexOf('let filaAbierta = null;'));
function render(lons,horaConocida=true){
 const node={innerHTML:''};
 const ctx={carta:{cuerpos:lons.map((lon,i)=>({lon,nombre:'Planeta '+i})),datos:{horaConocida}},mod360:x=>(x%360+360)%360,escaparHTML:s=>s,document:{getElementById:()=>node}};
 vm.runInNewContext(source+';pintaBalance();',ctx);return node.innerHTML;
}
test('twelve signs distribute equally and each group conserves all bodies',()=>{
 const result=render(Array.from({length:12},(_,i)=>i*30));
 assert.equal((result.match(/3 \/ 12 · 25%/g)||[]).length,4);
 assert.equal((result.match(/4 \/ 12 · 33%/g)||[]).length,3);
 assert.equal((result.match(/6 \/ 12 · 50%/g)||[]).length,2);
});
test('zero Aries, sign boundary and wrapped longitudes use the correct group',()=>{
 const result=render([0,29.999,30,360,-.001,NaN],false);
 assert.match(result,/Fuego<\/span><strong>3 \/ 5 · 60%/);
 assert.match(result,/Tierra<\/span><strong>1 \/ 5 · 20%/);
 assert.match(result,/Agua<\/span><strong>1 \/ 5 · 20%/);
 assert.match(result,/Sin hora conocida/);
 assert.doesNotMatch(result,/NaN/);
});
