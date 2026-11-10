"""
Barajas propias en imagen (los mazos ilustrados): arma los ases y las cartas del 2 al 7 a partir
de los objetos sueltos que entrega el agente de arte (la "forma A" de INSTRUCTIVO-MAZOS.md). Las
figuras (10, 11 y 12) y el dorso no se tocan.

Uso (desde apps/web, con Python 3, Pillow y numpy), con el zip descomprimido:
    python scripts/barajas-propias-armar.py <carpeta del zip> [mazo…]

Sin mazos, arma todos los que tengan carpeta en el zip y en public/barajas. En cada carpeta del zip
van los 14 PNG transparentes: as-espada, as-basto, as-oro, as-copa (640 × 760), oro (600 × 600),
copa (480 × 600), espada-larga-a/b (220 × 1200), espada-corta-a/b (180 × 700), basto-largo-a/b
(260 × 1200) y basto-corto-a/b (220 × 700), con la punta o la cabeza arriba.

Cómo arma cada carta:
- Conserva el marco con sus cortes y los dos números; todo lo demás de adentro del marco se
  repinta con el papel limpio del mazo (los dibujos viejos a veces bajaban hasta el número: en el
  cuadro de cada número se deja solo la tinta del número). El papel sale de las 28 cartas actuales: en cada píxel, la mediana de las
  cartas que ahí tienen papel (el dibujo cambia de lugar de una carta a otra). Si un píxel no tiene
  papel en ninguna, va el color medio del papel con un grano parecido.
- Cada objeto se recorta a lo que tiene dibujo y se escala para que su largo (el alto de la copa,
  el diámetro de la moneda, el largo de punta a punta de la espada o del basto) sea el de las
  tablas del instructivo, y se centra en sus coordenadas. Los ases llenan la zona de los palos
  (x 40–360, y 110–490). Todo se dibuja al doble de tamaño y se achica al final.
- En cada carta las espadas y los bastos alternan los dos colores (a y b).

Correrlo de nuevo pisa las cartas: el papel se vuelve a sacar de las cartas ya armadas.
"""

import math
import sys
import warnings
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

WEB = Path(__file__).resolve().parent.parent
BARAJAS = WEB / 'public' / 'barajas'

ANCHO, ALTO = 400, 600
S = 2  # se dibuja al doble y se achica al final
# Lo que se repinta con papel: todo lo de adentro del marco (líneas en x 19–20 y 379–380, y 23–24 y
# 575–576) menos los dos números (el de arriba en x 32–57, y 62–98, y el de abajo dado vuelta). Los
# dibujos viejos a veces bajaban hasta el número de abajo.
ADENTRO = (22, 27, 378, 573)
NUMEROS = ((22, 27, 67, 107), (333, 493, 378, 573))
ZONA = (40, 110, 360, 490)
CENTRO = (200, 300)

PALOS = ('oro', 'copa', 'espada', 'basto')


def gira(arriba_hacia):
    """Los grados (en sentido horario) que hay que girar un objeto con la punta arriba para que apunte a (dx, dy)."""
    dx, dy = arriba_hacia
    return math.degrees(math.atan2(dx, -dy))


def hacia(desde, hasta):
    dx, dy = hasta[0] - desde[0], hasta[1] - desde[1]
    n = math.hypot(dx, dy)
    return dx / n, dy / n


# ── Dónde va cada palo (centro x, centro y, largo, giro en grados horarios) ──────────────────

def oros_copas(n):
    """Oros y copas: siempre derechos. (x, y, tamaño)."""
    return {
        2: [(200, 205, 160), (200, 395, 160)],
        3: [(130, 190, 140), (270, 300, 140), (130, 410, 140)],
        4: [(120, 185, 130), (280, 185, 130), (120, 415, 130), (280, 415, 130)],
        5: [(115, 175, 115), (285, 175, 115), (200, 300, 150), (115, 425, 115), (285, 425, 115)],
        6: [(x, y, 110) for y in (175, 300, 425) for x in (130, 270)],
        7: [(125, 170, 100), (275, 170, 100), (200, 240, 100), (125, 315, 100), (275, 315, 100), (125, 430, 100), (275, 430, 100)],
    }[n]


def en_x(pomo, largo):
    """Espada del 4: el pomo en la esquina y la punta hacia el centro de la carta."""
    d = hacia(pomo, CENTRO)
    return (pomo[0] + d[0] * largo / 2, pomo[1] + d[1] * largo / 2, largo, gira(d))


def espadas(n):
    """(x, y, largo, giro, color). Con la empuñadura arriba es girar 180."""
    if n == 2:
        return 'larga', [(140, 300, 360, 180, 'a'), (260, 300, 360, 0, 'b')]
    if n == 3:
        return 'larga', [(105, 300, 360, 0, 'a'), (200, 300, 360, 180, 'b'), (295, 300, 360, 0, 'a')]
    if n == 4:
        esquinas = [(75, 115), (325, 115), (75, 485), (325, 485)]
        return 'corta', [(*en_x(p, 195), c) for p, c in zip(esquinas, 'abba')]
    if n == 5:
        return 'corta', [
            (100, 200, 170, 180, 'a'), (300, 200, 170, 180, 'b'),
            (100, 400, 170, 0, 'b'), (300, 400, 170, 0, 'a'),
            # Acostada, con la empuñadura a la izquierda.
            (200, 300, 180, 90, 'a'),
        ]
    if n == 6:
        return 'corta', [(x, 205, 170, 180, c) for x, c in zip((105, 200, 295), 'aba')] + \
            [(x, 395, 170, 0, c) for x, c in zip((105, 200, 295), 'bab')]
    return 'corta', [(x, 190, 150, 180, c) for x, c in zip((105, 200, 295), 'aba')] + \
        [(x, 410, 150, 0, c) for x, c in zip((105, 200, 295), 'bab')] + [(200, 300, 200, 90, 'a')]


def en_x_basto(centro, largo):
    """Basto del 4 y del 5: la cabeza hacia la esquina y la punta fina hacia el centro."""
    return (centro[0], centro[1], largo, gira(hacia(CENTRO, centro)))


def bastos(n):
    """(x, y, largo, giro, color). Con la cabeza abajo es girar 180."""
    if n == 2:
        return 'largo', [(125, 300, 350, 0, 'a'), (275, 300, 350, 0, 'b')]
    if n == 3:
        # Cruzados: los dos en diagonal (40° a cada lado) abajo y el parado encima.
        return 'largo', [(200, 300, 360, -40, 'a'), (200, 300, 360, 40, 'a'), (200, 300, 360, 0, 'b')]
    if n == 4:
        centros = [(125, 190), (275, 190), (125, 410), (275, 410)]
        return 'corto', [(*en_x_basto(c, 210), col) for c, col in zip(centros, 'abba')]
    if n == 5:
        centros = [(115, 180), (285, 180), (115, 420), (285, 420)]
        # Acostado, con la cabeza a la izquierda.
        return 'corto', [(*en_x_basto(c, 180), col) for c, col in zip(centros, 'abba')] + [(200, 300, 200, -90, 'a')]
    if n == 6:
        return 'corto', [(x, 205, 170, 0, c) for x, c in zip((105, 200, 295), 'aba')] + \
            [(x, 395, 170, 180, c) for x, c in zip((105, 200, 295), 'bab')]
    return 'corto', [(x, 190, 150, 0, c) for x, c in zip((105, 200, 295), 'aba')] + \
        [(x, 410, 150, 180, c) for x, c in zip((105, 200, 295), 'bab')] + [(200, 300, 200, -90, 'a')]


# ── Objetos y capas ──────────────────────────────────────────────────────────────────────────

def cargar(archivo):
    """El objeto recortado a su dibujo, premultiplicado (RGBa) para escalarlo y girarlo sin halos."""
    im = Image.open(archivo).convert('RGBA')
    px = np.asarray(im).copy()
    # Vienen en paleta y lo opaco quedó en 249–254: se lleva a 255 para que no se trasluzca el papel.
    a = px[..., 3].astype(np.float32)
    px[..., 3] = np.clip(a * 255 / 245, 0, 255).astype(np.uint8)
    im = Image.fromarray(px, 'RGBA')
    caja = Image.fromarray((px[..., 3] > 8).astype(np.uint8) * 255).getbbox()
    return im.crop(caja).convert('RGBa')


def poner(capa, obj, x, y, largo, giro=0, medida='alto'):
    """Escala el objeto a su largo, lo gira y lo apoya con su centro en (x, y) sobre la capa."""
    w, h = obj.size
    lado = h if medida == 'alto' else max(w, h)
    f = largo * S / lado
    im = obj.resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS)
    if giro:
        im = im.rotate(-giro, resample=Image.BICUBIC, expand=True)
    px, py = x * S - im.width / 2, y * S - im.height / 2
    # Nada se sale de la zona de los palos ni toca los números: si se sale (la cabeza ancha de los
    # bastos del 4 y del 5, en las esquinas), se corre para adentro lo justo.
    caja = im.getchannel(3).point(lambda a: 255 if a > 24 else 0).getbbox()
    if caja:
        zx0, zy0, zx1, zy1 = (v * S for v in ZONA)
        px += max(0, zx0 - (px + caja[0])) - max(0, px + caja[2] - zx1)
        py += max(0, zy0 - (py + caja[1])) - max(0, py + caja[3] - zy1)
    encima(capa, np.asarray(im).astype(np.float32) / 255, px, py)


def encajar(capa, obj, caja):
    """El as: lo más grande que entra en la caja, centrado."""
    x0, y0, x1, y1 = caja
    w, h = obj.size
    f = min((x1 - x0) * S / w, (y1 - y0) * S / h)
    im = obj.resize((round(w * f), round(h * f)), Image.LANCZOS)
    encima(capa, np.asarray(im).astype(np.float32) / 255, (x0 + x1) / 2 * S - im.width / 2, (y0 + y1) / 2 * S - im.height / 2)


def encima(capa, src, x, y):
    """Composición "over" en premultiplicado, recortando lo que se salga de la capa."""
    x, y = round(x), round(y)
    H, W = capa.shape[:2]
    h, w = src.shape[:2]
    cx0, cy0, cx1, cy1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if cx0 >= cx1 or cy0 >= cy1:
        return
    s = src[cy0 - y:cy1 - y, cx0 - x:cx1 - x]
    d = capa[cy0:cy1, cx0:cx1]
    capa[cy0:cy1, cx0:cx1] = s + d * (1 - s[..., 3:4])


def achicar(capa):
    """La capa del doble, al tamaño de la carta (sigue premultiplicada, de 0 a 1)."""
    im = Image.fromarray((capa * 255).round().clip(0, 255).astype(np.uint8), 'RGBa')
    return np.asarray(im.resize((ANCHO, ALTO), Image.LANCZOS)).astype(np.float32) / 255


# ── Papel ────────────────────────────────────────────────────────────────────────────────────

def mascara():
    """Dónde se repinta el papel: adentro del marco, menos los números."""
    m = np.zeros((ALTO, ANCHO), bool)
    x0, y0, x1, y1 = ADENTRO
    m[y0:y1, x0:x1] = True
    for x0, y0, x1, y1 in NUMEROS:
        m[y0:y1, x0:x1] = False
    return m


def sobra_junto_al_numero(carta):
    """En el cuadro de cada número, lo que no es la tinta del número (restos de los dibujos viejos)."""
    gris = carta @ np.array([0.299, 0.587, 0.114], np.float32)
    tinta = Image.fromarray(((gris < 0.47) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    sobra = np.zeros(gris.shape, bool)
    for x0, y0, x1, y1 in NUMEROS:
        sobra[y0:y1, x0:x1] = True
    return sobra & ~(np.asarray(tinta) > 0)


def papel_del_mazo(carpeta):
    """La carta sin dibujo (adentro del marco), sacada de las cartas del 1 al 7 del mazo."""
    pila = np.stack([
        np.asarray(Image.open(carpeta / f'{n}-{p}.webp').convert('RGB')).astype(np.float32)
        for n in range(1, 8) for p in PALOS
    ])
    # El color del papel: entre la línea del marco y la zona de los palos casi nunca hay dibujo.
    margen = pila[:, 120:480, 24:37].reshape(-1, 3)
    ref = np.median(margen, axis=0)
    grano = margen.std(axis=0)
    es_papel = np.abs(pila - ref).sum(axis=3) < 36
    with np.errstate(invalid='ignore'), warnings.catch_warnings():
        warnings.simplefilter('ignore', RuntimeWarning)
        papel = np.nanmedian(np.where(es_papel[..., None], pila, np.nan), axis=0)
    sin = (np.isnan(papel[..., 0]) | (es_papel.sum(axis=0) < 3)) & mascara()
    if sin.any():
        ruido = np.random.default_rng(0).normal(0, 1, papel.shape) * grano
        papel = np.where(sin[..., None], ref + ruido, papel)
    return np.nan_to_num(papel), int(sin.sum())


# ── Cartas ───────────────────────────────────────────────────────────────────────────────────

def capa_de(objetos, palo, n):
    capa = np.zeros((ALTO * S, ANCHO * S, 4), np.float32)
    if n == 1:
        encajar(capa, objetos[f'as-{palo}'], ZONA)
    elif palo in ('oro', 'copa'):
        for x, y, t in oros_copas(n):
            poner(capa, objetos[palo], x, y, t, medida='lado' if palo == 'oro' else 'alto')
    else:
        variante, lista = (espadas if palo == 'espada' else bastos)(n)
        for x, y, largo, giro, color in lista:
            poner(capa, objetos[f'{palo}-{variante}-{color}'], x, y, largo, giro)
    return achicar(capa)


def armar(zip_, mazo):
    origen, destino = zip_ / mazo, BARAJAS / mazo
    objetos = {p.stem: cargar(p) for p in origen.glob('*.png')}
    hacen_falta = {'as-espada', 'as-basto', 'as-oro', 'as-copa', 'oro', 'copa'} | {
        f'{p}-{v}-{c}' for p, vs in (('espada', ('larga', 'corta')), ('basto', ('largo', 'corto'))) for v in vs for c in 'ab'
    }
    faltan = hacen_falta - objetos.keys()
    if faltan:
        print(f'{mazo}: faltan {", ".join(sorted(faltan))}; no se arma')
        return
    papel, sin = papel_del_mazo(destino)
    repintar = mascara()
    for palo in PALOS:
        for n in range(1, 8):
            archivo = destino / f'{n}-{palo}.webp'
            carta = np.asarray(Image.open(archivo).convert('RGB')).astype(np.float32) / 255
            carta = np.where((repintar | sobra_junto_al_numero(carta))[..., None], papel / 255, carta)
            capa = capa_de(objetos, palo, n)
            carta = capa[..., :3] + carta * (1 - capa[..., 3:4])
            Image.fromarray((carta * 255).round().clip(0, 255).astype(np.uint8), 'RGB').save(archivo, 'WEBP', quality=88, method=6)
    print(f'{mazo}: 28 cartas' + (f' ({sin} píxeles de papel inventado)' if sin else ''))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    zip_ = Path(sys.argv[1])
    mazos = sys.argv[2:] or sorted(p.name for p in zip_.iterdir() if p.is_dir() and (BARAJAS / p.name).is_dir())
    for mazo in mazos:
        armar(zip_, mazo)


if __name__ == '__main__':
    main()
