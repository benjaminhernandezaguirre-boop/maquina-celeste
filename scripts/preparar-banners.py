#!/usr/bin/env python3
"""Convierte los 12 banners PNG aprobados a WebP para la web.

Uso: python scripts/preparar-banners.py CARPETA_FUENTE CARPETA_DESTINO

Requiere Pillow en el entorno de trabajo, no en la web. WebP reduce el peso
mediante compresion con perdida: no redibuja, recorta ni cambia dimensiones,
composicion o contenido. Empieza en calidad 90 y baja hasta 77 solo cuando
hace falta para acercarse al presupuesto de 200 kB por archivo. Si no basta,
conserva la calidad minima e informa del exceso; nunca reduce la resolucion.
"""

import argparse
from io import BytesIO
from pathlib import Path

from PIL import Image


SIGNOS = (
    "aries", "tauro", "geminis", "cancer", "leo", "virgo",
    "libra", "escorpio", "sagitario", "capricornio", "acuario", "piscis",
)
PRESUPUESTO = 200_000
CALIDADES = (*range(90, 77, -2), 77)


def convertir(origen, destino):
    with Image.open(origen) as imagen:
        if imagen.format != "PNG" or imagen.mode not in ("RGB", "RGBA"):
            raise ValueError(f"Se esperaba un PNG RGB/RGBA aprobado: {origen}")
        if getattr(imagen, "n_frames", 1) != 1:
            raise ValueError(f"El banner debe tener una sola imagen: {origen}")
        imagen.load()
        dimensiones = imagen.size
        metadatos = {
            clave: imagen.info[clave]
            for clave in ("icc_profile", "exif")
            if imagen.info.get(clave)
        }
        for calidad in CALIDADES:
            salida = BytesIO()
            imagen.save(salida, "WEBP", quality=calidad, method=6, **metadatos)
            contenido = salida.getvalue()
            if len(contenido) <= PRESUPUESTO:
                break
        with Image.open(BytesIO(contenido)) as verificacion:
            verificacion.load()
            if verificacion.format != "WEBP" or verificacion.size != dimensiones:
                raise ValueError(f"Formato o dimensiones inesperados: {destino}")
        destino.write_bytes(contenido)
    return dimensiones, calidad, len(contenido)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("fuente", type=Path, help="Carpeta de los doce PNG aprobados")
    parser.add_argument("destino", type=Path, help="Carpeta para los doce WebP")
    args = parser.parse_args()
    fuentes = [args.fuente / f"{signo}.png" for signo in SIGNOS]
    ausentes = [str(ruta) for ruta in fuentes if not ruta.is_file()]
    if ausentes:
        parser.error("Faltan originales: " + ", ".join(ausentes))
    args.destino.mkdir(parents=True, exist_ok=True)
    total_png = sum(ruta.stat().st_size for ruta in fuentes)
    total_webp = 0
    for signo, fuente in zip(SIGNOS, fuentes):
        destino = args.destino / f"{signo}.webp"
        (ancho, alto), calidad, peso = convertir(fuente, destino)
        total_webp += peso
        aviso = " (supera el presupuesto)" if peso > PRESUPUESTO else ""
        print(f"{signo:12} {ancho}x{alto}  calidad={calidad}  {peso:7} bytes{aviso}")
    ahorro = (1 - total_webp / total_png) * 100
    print(f"Total: {total_png} bytes PNG -> {total_webp} bytes WebP ({ahorro:.1f}% menos)")


if __name__ == "__main__":
    main()
