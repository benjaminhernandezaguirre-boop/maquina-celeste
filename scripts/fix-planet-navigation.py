from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old = "stage.addEventListener('pointerdown',e=>{if(e.target.closest('.sun,.zodiac'))return;dragging=true;"
new = "stage.addEventListener('pointerdown',e=>{if(e.target.closest('.sun,.zodiac,.planet'))return;dragging=true;"
if old not in s:
    raise SystemExit('No se encontró el manejador pointerdown esperado')
s = s.replace(old, new, 1)

old2 = "p.addEventListener('click',()=>{if(dragged){dragged=false;return}if(i!==activeIndex){rotateTo(i);show(p,matchMedia('(pointer:coarse)').matches?'Seleccionado · toca de nuevo para abrir.':'Seleccionando…');return}activate(p)})"
new2 = "p.addEventListener('click',()=>{if(dragged){dragged=false;return}setActive(i);activate(p)})"
if old2 not in s:
    raise SystemExit('No se encontró el manejador click esperado')
s = s.replace(old2, new2, 1)

s = s.replace("Toca de nuevo para abrir.", "Toca para abrir.")
s = s.replace("Desliza para explorar · toca para seleccionar<br>Toca de nuevo para abrir", "Desliza por el fondo para explorar · toca un astro para abrir")

p.write_text(s, encoding='utf-8')
print('Navegación planetaria corregida')
