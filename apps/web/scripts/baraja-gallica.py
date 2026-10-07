"""
Barajas antiguas de la Biblioteca Nacional de Francia (Gallica), de dominio público, subidas a
Wikimedia Commons: "El Cid" (Simeón Durá, Valencia, 1888) y la de B. P. Grimaud (Francia, 1860).
Baja las 40 cartas y el dorso, las lleva a 400 × 600 y las guarda como WebP en
public/barajas/<carpeta>/ (ver CREDITOS.md en cada carpeta).

Uso (desde apps/web, con Python 3 y Pillow):
    python scripts/baraja-gallica.py cid1888|grimaud1860 [carpeta-cache]

Como baraja-fournier.py (de donde toma la descarga): pide miniaturas de 960 px, verifica que la
licencia de cada archivo sea "Public domain" antes de escribir nada y deja las descargas en una
caché. Al final mide, en las 40 cartas, dónde quedan la línea de los cortes y el número, para las
zonas del ojeo (src/ojeo.ts).

Recorte: estos escaneos ya vienen recortados al borde de la carta, sin fondo. Se saca un poco del
canto (MARGEN) y se lleva a 2:3 recortando parejo arriba y abajo, centrado en el marco impreso, así
la línea de los cortes queda a la misma altura en las 40.
"""

import importlib.util
import os
import statistics
import sys
import tempfile
import time

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('fournier', os.path.join(AQUI, 'baraja-fournier.py'))
fournier = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fournier)

ANCHO, ALTO = 400, 600
CALIDAD = 80
CALIDAD_DORSO = 60
MARGEN = 0.01
PALOS = ['espada', 'basto', 'oro', 'copa']
NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]

CID = 'File:Jeu de cartes au portrait espagnol dit "El Cid" - estampe - btv1b10532628b ({:02d} of 96).jpg'
# En el escaneo de "El Cid" van las 48 cartas, cada una seguida de su reverso: oros, copas,
# espadas y bastos, del 1 al 12. Las de truco son las impares, sin el 8 ni el 9.
CID_PALO = {'oro': 0, 'copa': 1, 'espada': 2, 'basto': 3}
CID_ORDEN = {n: i for i, n in enumerate([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}

GRIMAUD = "File:Jeu d'Aluette - Grimaud - 1860 - {}.jpg"
INGLES_N = {1: 'Ace', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 10: 'Jack', 11: 'Knight', 12: 'King'}
INGLES_P = {'espada': 'Swords', 'basto': 'Clubs', 'oro': 'Coins', 'copa': 'Cups'}

BARAJAS = {
    'cid1888': {
        'carpeta': 'cid-1888',
        'titulo': lambda n, p: CID.format(1 + 24 * CID_PALO[p] + 2 * CID_ORDEN[n]),
        'dorso': CID.format(2),
    },
    'grimaud1860': {
        'carpeta': 'grimaud-1860',
        'titulo': lambda n, p: GRIMAUD.format(f'{INGLES_N[n]} of {INGLES_P[p]}'),
        'dorso': GRIMAUD.format('Back side'),
    },
}


def lineas(gris: Image.Image) -> tuple[int, int] | None:
    """
    Filas de la línea de arriba y de abajo del marco impreso (None si no tiene: el dorso). Es la
    primera fila desde cada borde con tinta en buena parte del ancho (aunque la corten los cortes
    del palo): no la más oscura, porque en algunas cartas el dibujo (una copa, una leyenda) arranca
    pegado al marco y tiene más tinta.
    """
    w, h = gris.size
    datos = gris.tobytes()

    def oscuros(y: int) -> int:
        return sum(1 for x in range(w // 10, w - w // 10, 2) if datos[y * w + x] < 140) * 2

    minimo = w * 0.15
    arriba = next((y for y in range(0, h // 6) if oscuros(y) >= minimo), None)
    abajo = next((y for y in range(h - 1, h - h // 6, -1) if oscuros(y) >= minimo), None)
    if arriba is None or abajo is None:
        return None
    return arriba, abajo


def linea_izquierda(gris: Image.Image) -> int:
    """Columna de la línea de la izquierda del marco: la primera con tinta en casi todo el medio."""
    w, h = gris.size
    datos = gris.tobytes()
    medio = range(h // 4, 3 * h // 4, 2)
    return next(x for x in range(0, w // 4) if sum(1 for y in medio if datos[y * w + x] < 140) > len(medio) * 0.7)


def procesar(img: Image.Image) -> Image.Image:
    plano = img.convert('RGB')
    w, h = plano.size
    m = round(w * MARGEN)
    plano = plano.crop((m, m, w - m, h - m))
    w, h = plano.size
    marco = lineas(plano.convert('L'))
    cy = (marco[0] + marco[1]) / 2 if marco else h / 2
    alto = round(w * ALTO / ANCHO)
    if alto <= h:
        arriba = max(0, min(round(cy - alto / 2), h - alto))
        plano = plano.crop((0, arriba, w, arriba + alto))
    else:
        # Más ancha que 2:3 (no debería pasar): se recorta de los costados.
        ancho = round(h * ANCHO / ALTO)
        izq = (w - ancho) // 2
        plano = plano.crop((izq, 0, izq + ancho, h))
    return plano.resize((ANCHO, ALTO), Image.LANCZOS)


def medir(carta: Image.Image) -> tuple[float, float, float] | None:
    """
    En la carta ya procesada: altura (fracción) de la línea de arriba del marco, y desde dónde
    hasta dónde va el número de la esquina de arriba a la izquierda.
    """
    gris = carta.convert('L')
    w, h = gris.size
    datos = gris.tobytes()
    marco = lineas(gris)
    if not marco:
        return None
    linea = marco[0]
    # El número está adentro del marco, pegado a la esquina: filas con tinta entre la línea de la
    # izquierda y un poco más adentro.
    izq = linea_izquierda(gris)
    x0, x1 = izq + 4, izq + round(w * 0.11)
    filas = [y for y in range(linea + 3, linea + h // 6) if any(datos[y * w + x] < 110 for x in range(x0, x1))]
    if not filas:
        return linea / h, None, None
    # Solo el primer bloque de filas seguidas (el número), no lo que haya debajo.
    fin = filas[0]
    for y in filas[1:]:
        if y > fin + 2:
            break
        fin = y
    return linea / h, filas[0] / h, (fin + 1) / h


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) < 2 or sys.argv[1] not in BARAJAS:
        sys.exit(f'Uso: python scripts/baraja-gallica.py {"|".join(BARAJAS)} [carpeta-cache]')
    id_baraja = sys.argv[1]
    b = BARAJAS[id_baraja]
    cache = sys.argv[2] if len(sys.argv) > 2 else os.path.join(tempfile.gettempdir(), f'truco-{b["carpeta"]}')
    os.makedirs(cache, exist_ok=True)
    salida = os.path.join(AQUI, '..', 'public', 'barajas', b['carpeta'])

    lista = [(f'{n}-{p}', b['titulo'](n, p)) for p in PALOS for n in NUMEROS] + [('dorso', b['dorso'])]
    metas = fournier.info([t for _, t in lista])
    malas = [(t, metas[t]['extmetadata'].get('LicenseShortName', {}).get('value')) for _, t in lista]
    malas = [(t, lic) for t, lic in malas if lic != 'Public domain']
    if malas:
        for t, lic in malas:
            print(f'Licencia inesperada en {t}: {lic!r}')
        sys.exit(1)

    os.makedirs(salida, exist_ok=True)
    total = 0
    medidas = []
    for nombre, t in lista:
        local = os.path.join(cache, nombre + '.jpg')
        if not os.path.exists(local):
            with open(local, 'wb') as f:
                f.write(fournier.pedir(metas[t]['thumburl']))
            time.sleep(0.5)  # sin apurar a Commons
        img = Image.open(local)
        carta = procesar(img)
        destino = os.path.join(salida, nombre + '.webp')
        carta.save(destino, 'WEBP', quality=CALIDAD_DORSO if nombre == 'dorso' else CALIDAD, method=6)
        total += os.path.getsize(destino)
        m = medir(carta) if nombre != 'dorso' else None
        if m:
            medidas.append((nombre, *m))
        print(f'{nombre:10} {img.width}x{img.height} (alto/ancho {img.height / img.width:.3f})'
              + (f'  línea {m[0]:.3f}  número {m[1]:.3f}–{m[2]:.3f}' if m and m[1] is not None else ''))
    print(f'Total: {total / 1024:.0f} KB en {len(lista)} archivos')
    con_numero = [x for x in medidas if x[2] is not None]
    if con_numero:
        for i, que in [(1, 'línea'), (2, 'número desde'), (3, 'número hasta')]:
            v = [x[i] for x in con_numero]
            print(f'{que:13} mediana {statistics.median(v):.3f}  mín {min(v):.3f}  máx {max(v):.3f}')


if __name__ == '__main__':
    main()
