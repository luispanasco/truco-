"""
Barajas propias en imagen (Oriental, Costa Uruguaya, Colonial y Grabado Nocturno): agranda los
huecos de la línea de los cortes, arriba y abajo de cada carta, para que se parezcan a los de las
barajas antiguas (en El Cid y en Grimaud el hueco es el 14–15 % del largo de la línea: unos 50 px
de 330). Venían de 20 px.

Uso (desde apps/web, con Python 3 y Pillow):
    python scripts/barajas-propias-cortes.py [ancho]

Cada hueco se rehace centrado donde estaba, del ancho pedido (por defecto 50 px), así que correrlo
dos veces da lo mismo. Lo que se borra de la línea se rellena con el papel de unas filas más
adentro de la misma carta: se conserva la textura y no quedan parches.
"""

import sys
from pathlib import Path

from PIL import Image

CARPETAS = ['oriental', 'costa-uruguaya', 'colonial', 'grabado-nocturno']
BARAJAS = Path(__file__).resolve().parent.parent / 'public' / 'barajas'
OSCURO = 110


def filas_de_la_linea(gris, desde, hasta, ancho):
    """Las filas (entre desde y hasta) donde está la línea del marco: oscuras en buena parte del ancho."""
    return [y for y in range(desde, hasta) if sum(gris[x, y] < OSCURO for x in range(20, ancho - 20)) > 0.3 * (ancho - 40)]


def huecos(gris, y, ancho):
    """Los huecos (x de inicio y de fin) entre los tramos oscuros de la fila y."""
    tramos, inicio = [], None
    for x in range(ancho + 1):
        oscuro = x < ancho and gris[x, y] < OSCURO
        if oscuro and inicio is None:
            inicio = x
        if not oscuro and inicio is not None:
            tramos.append((inicio, x - 1))
            inicio = None
    return [(a[1] + 1, b[0] - 1) for a, b in zip(tramos, tramos[1:])]


def agrandar(archivo, ancho_hueco):
    imagen = Image.open(archivo).convert('RGB')
    gris = imagen.convert('L').load()
    px = imagen.load()
    ancho, alto = imagen.size
    # La línea de arriba se rellena con el papel de más abajo, y la de abajo con el de más arriba.
    for desde, hasta, paso in ((10, 40, 14), (alto - 40, alto - 10, -14)):
        filas = filas_de_la_linea(gris, desde, hasta, ancho)
        if not filas:
            continue
        for a, b in huecos(gris, filas[len(filas) // 2], ancho):
            centro = (a + b) / 2
            x0, x1 = round(centro - ancho_hueco / 2), round(centro + ancho_hueco / 2)
            # La línea con su borde suave: dos filas más de cada lado.
            for y in range(min(filas) - 2, max(filas) + 3):
                for x in range(x0, x1 + 1):
                    px[x, y] = px[x, y + paso]
    imagen.save(archivo, 'WEBP', quality=88, method=6)


def main():
    ancho_hueco = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    for carpeta in CARPETAS:
        cartas = sorted(p for p in (BARAJAS / carpeta).glob('*.webp') if p.name != 'dorso.webp')
        for archivo in cartas:
            agrandar(archivo, ancho_hueco)
        print(f'{carpeta}: {len(cartas)} cartas')


if __name__ == '__main__':
    main()
