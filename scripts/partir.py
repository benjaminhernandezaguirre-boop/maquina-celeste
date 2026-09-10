#!/usr/bin/env python3
"""Parte astroplanetario.html en app/part-00..07.txt.

Solo hace falta si vuelves a usar una herramienta que no admita archivos grandes.
El sitio ya no lee esos trozos: sirve astroplanetario.html directamente.

    python3 scripts/partir.py
"""
from pathlib import Path

TROZOS = 8
fuente = Path("astroplanetario.html")
texto = fuente.read_text(encoding="utf-8")
paso = -(-len(texto) // TROZOS)          # división redondeando hacia arriba
destino = Path("app"); destino.mkdir(exist_ok=True)
for i in range(TROZOS):
    parte = texto[i*paso:(i+1)*paso]
    (destino / f"part-{i:02d}.txt").write_text(parte, encoding="utf-8")
    print(f"part-{i:02d}.txt  {len(parte):>7} caracteres")
print("Listo. Recuerda: la fuente es astroplanetario.html, los trozos son copia.")
