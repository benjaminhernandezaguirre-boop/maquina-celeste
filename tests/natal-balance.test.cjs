const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../astroplanetario.html'),'utf8');
const source=html.slice(html.indexOf('function datosBalance(){'),html.indexOf('let filaAbierta = null;'));
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
test('full-sheet balance paints nine bars and matching percentages within its reserved space',()=>{
 const texts=[],rects=[];
 const g={fillText:(text,x,y)=>texts.push({text,x,y}),fillRect:(...r)=>rects.push(r)};
 const ctx={carta:{cuerpos:Array.from({length:10},(_,i)=>({lon:i*30,nombre:'Planeta '+i})),datos:{horaConocida:false}},mod360:x=>(x%360+360)%360,PAPEL:{},rotuloHoja:(g,y,text,x)=>g.fillText(text,x,y)};
 vm.createContext(ctx);vm.runInContext(source,ctx);ctx.pintaBalanceHoja(g,60,1780,1500);
 assert.equal(rects.length,18);
 for(const [x,y,w,h] of rects){assert.ok(x>=60&&x+w<=1560);assert.ok(y>=1780&&y+h<2430);}
 for(const title of ['ELEMENTOS','MODALIDADES','POLARIDADES'])assert.ok(texts.some(t=>t.text===title));
 assert.equal(texts.filter(t=>/\/10 · \d+%/.test(t.text)).length,9);
 assert.ok(texts.some(t=>t.text.startsWith('Sin hora conocida')));
 assert.ok(texts.every(t=>t.y<2430));
 assert.match(html,/pintaBalanceHoja\(g, margen, balanceY, lado\)/);
});
