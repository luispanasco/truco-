"""
Baraja clásica (Heraclio Fournier, 1878): baja las 41 imágenes de Wikimedia Commons, recorta el
escaneo para quedar solo con la carta y las guarda como WebP en public/barajas/fournier-1878/.

Fuente: https://commons.wikimedia.org/wiki/Category:Heraclio_Fournier%E2%80%99s_1878_card_deck
(dominio público; ver CREDITOS.md en la carpeta de salida).

Uso (desde apps/web, con Python 3 y Pillow):
    python scripts/baraja-fournier.py [carpeta-cache]

Pide miniaturas de 600 px de ancho (no los originales de 3–7 MB); Commons las sirve en su medida
estándar más cercana, 960 px. Las deja en la carpeta de caché (por defecto un temporal) para no
volver a bajarlas. Antes de usar los archivos verifica que la licencia de cada uno en Commons sea
"Public domain"; si alguno no lo es, frena y no escribe nada.

Recorte: el escaneo trae la carta apenas torcida, con el canto gastado y el fondo transparente.
Se toma el rectángulo interior de la carta y se recorta un poco más hacia adentro (MARGEN).
Después se lleva a 400 × 600: la carta real es más angosta que 2:3 (alto/ancho ≈ 1,606 contra
1,5), así que se recorta parejo arriba y abajo (≈ 3,3 % de cada lado, solo margen blanco: el marco
con los cortes queda entero) en vez de deformarla o cambiar la forma de todas las cartas.
"""

import json
import os
import sys
import tempfile
import time
import urllib.parse
import urllib.request

from PIL import Image, ImageChops, ImageFilter

UA = 'TrucoUruguayo/0.1 (proyecto personal; baraja-fournier.py)'
API = 'https://commons.wikimedia.org/w/api.php'
AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, '..', 'public', 'barajas', 'fournier-1878')
ANCHO, ALTO = 400, 600
CALIDAD = 80
# El dorso es una trama fina que en WebP pesa el doble: con algo menos de calidad no se nota.
CALIDAD_DORSO = 60
# Color del papel, para rellenar algún hueco transparente del escaneo.
PAPEL = (236, 226, 204, 255)
# Margen (fracción del ancho de la carta) que se le saca al contorno detectado: el canto del
# naipe escaneado viene gastado y con sombra.
MARGEN = 0.012
# Alto del marco impreso (de la línea de arriba a la de abajo) en fracción del alto del escaneo:
# medido en las 40 cartas, 1307 ± 2 px de 1517.
ALTO_MARCO = 0.862

NUMEROS = {1: 'bateko', 2: 'biko', 3: 'hiruko', 4: 'lauko', 5: 'bosteko', 6: 'seiko', 7: 'zazpiko', 10: 'txota', 11: 'zaldi', 12: 'errege'}
PALOS = {'basto': 'bastoia', 'espada': 'ezpata', 'copa': 'kopa', 'oro': 'urrea'}


def titulo(nombre_euskera: str) -> str:
    return f'File:Fournier 1878 - {nombre_euskera} (ref. 44470).png'


def cartas() -> list[tuple[str, str]]:
    """(archivo de salida sin extensión, título en Commons) de las 40 cartas y el dorso."""
    lista = [(f'{n}-{p}', titulo(f'{eu} {PALOS[p]}')) for p in PALOS for n, eu in NUMEROS.items()]
    lista.append(('dorso', titulo('Atzealdea')))
    return lista


def pedir(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    for intento in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception:
            if intento == 3:
                raise
            time.sleep(10 + intento * 20)  # 429: Commons pide calma
    raise RuntimeError('inalcanzable')


def info(titulos: list[str]) -> dict[str, dict]:
    """imageinfo (miniatura y metadatos) de varios archivos, de a 10 por pedido."""
    salida: dict[str, dict] = {}
    for i in range(0, len(titulos), 10):
        # Se pide de 600 px de ancho; Commons la redondea a su medida estándar más cercana (960).
        q = urllib.parse.urlencode({
            'action': 'query', 'titles': '|'.join(titulos[i:i + 10]), 'prop': 'imageinfo',
            'iiprop': 'url|extmetadata', 'iiurlwidth': 600, 'format': 'json', 'formatversion': 2,
        })
        crudo = pedir(f'{API}?{q}')
        try:
            datos = json.loads(crudo)
        except json.JSONDecodeError:
            sys.exit(f'Respuesta inesperada de Commons: {crudo[:200]!r}')
        time.sleep(1)  # sin apurar a Commons
        normal = {n['to']: n['from'] for n in datos['query'].get('normalized', [])}
        for pag in datos['query']['pages']:
            if 'imageinfo' not in pag:
                sys.exit(f'No está en Commons: {pag["title"]}')
            salida[normal.get(pag['title'], pag['title'])] = pag['imageinfo'][0]
    return salida


def contorno(img: Image.Image) -> tuple[int, int, int, int]:
    """
    Rectángulo de la carta dentro del escaneo. Los PNG de Commons ya vienen con el fondo
    transparente, pero la carta está apenas torcida y con las esquinas gastadas: se toman las
    filas y columnas que son carta (opacas) en casi todo su largo, que es el rectángulo interior.
    """
    if 'A' in img.getbands():
        mascara = img.getchannel('A').point(lambda v: 255 if v > 128 else 0)
    else:
        # Sin transparencia: lo que se diferencia del color de las esquinas (el fondo).
        rgb = img.convert('RGB')
        w, h = rgb.size
        esquinas = [rgb.getpixel(p) for p in [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]]
        fondo = tuple(sorted(c[k] for c in esquinas)[1] for k in range(3))
        dif = ImageChops.difference(rgb, Image.new('RGB', rgb.size, fondo)).convert('L')
        mascara = dif.point(lambda v: 255 if v > 40 else 0).filter(ImageFilter.MedianFilter(5))
    w, h = mascara.size
    datos = mascara.tobytes()
    col = [sum(1 for y in range(0, h, 2) if datos[y * w + x]) * 2 for x in range(w)]
    fil = [sum(1 for x in range(0, w, 2) if datos[y * w + x]) * 2 for y in range(h)]
    alto_carta = max(col)
    ancho_carta = max(fil)
    xs = [x for x, c in enumerate(col) if c > alto_carta * 0.9]
    ys = [y for y, c in enumerate(fil) if c > ancho_carta * 0.9]
    return xs[0], ys[0], xs[-1] + 1, ys[-1] + 1


def marco(plano: Image.Image, caja: tuple[int, int, int, int]) -> float | None:
    """
    Altura del medio del marco impreso (las líneas finas que rodean el dibujo), para centrar
    todas las cartas igual: así la línea de los cortes queda a la misma altura en las 40 y las
    zonas del ojeo sirven para todas. None si no se encuentra (el dorso no tiene marco).
    """
    x0, y0, x1, y1 = caja
    gris = plano.convert('L')
    w, h = gris.size
    datos = gris.tobytes()

    def oscuros_col(x: int, ya: int, yb: int) -> int:
        return sum(1 for y in range(ya, yb, 2) if datos[y * w + x] < 150) * 2

    def oscuros_fila(y: int, xa: int, xb: int) -> int:
        return sum(1 for x in range(xa, xb, 2) if datos[y * w + x] < 150) * 2

    an, al = x1 - x0, y1 - y0
    medio = (y0 + al // 4, y1 - al // 4)
    izq = max(range(x0, x0 + an // 6), key=lambda x: oscuros_col(x, *medio))
    der = max(range(x1 - an // 6, x1), key=lambda x: oscuros_col(x, *medio))
    if oscuros_col(izq, *medio) < (medio[1] - medio[0]) * 0.6:
        return None
    # La línea de arriba está cortada (los cortes del palo), pero igual es la fila más oscura.
    franja = (izq + 4, der - 4)
    arr = max(range(y0, y0 + al // 8), key=lambda y: oscuros_fila(y, *franja))
    if oscuros_fila(arr, *franja) < (franja[1] - franja[0]) * 0.3:
        return None
    # La de abajo se busca solo cerca de donde tiene que estar (el marco mide lo mismo en todas):
    # más abajo los pies de las figuras también son filas oscuras.
    alto_marco = round(ALTO_MARCO * h)
    aba = max(range(arr + alto_marco - h // 60, arr + alto_marco + h // 60), key=lambda y: oscuros_fila(y, *franja))
    return (arr + aba) / 2


def procesar(img: Image.Image) -> tuple[Image.Image, tuple[int, int]]:
    x0, y0, x1, y1 = contorno(img)
    m = round((x1 - x0) * MARGEN)
    x0, y0, x1, y1 = x0 + m, y0 + m, x1 - m, y1 - m
    # Algún escaneo tiene huecos transparentes adentro (un roto del papel): se rellenan con el
    # color del papel en vez de quedar negros.
    papel = Image.new('RGBA', img.size, PAPEL)
    plano = Image.alpha_composite(papel, img.convert('RGBA')).convert('RGB')
    w, h = x1 - x0, y1 - y0
    # Proporción 2:3 con todo el ancho de la carta. La carta es más alta que 2:3, así que se
    # recorta margen de arriba y abajo, centrando en el marco impreso (o en la carta, si no tiene).
    cy = marco(plano, (x0, y0, x1, y1)) or (y0 + y1) / 2
    alto = round(w * ALTO / ANCHO)
    arriba = round(cy - alto / 2)
    arriba = max(y0, min(arriba, y1 - alto))
    return plano.crop((x0, arriba, x1, arriba + alto)).resize((ANCHO, ALTO), Image.LANCZOS), (w, h)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    cache = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), 'truco-fournier-1878')
    os.makedirs(cache, exist_ok=True)
    lista = cartas()
    metas = info([t for _, t in lista])

    # Primero la licencia de todas: si una no es de dominio público no se escribe nada.
    malas = [(t, metas[t]['extmetadata'].get('LicenseShortName', {}).get('value')) for _, t in lista]
    malas = [(t, lic) for t, lic in malas if lic != 'Public domain']
    if malas:
        for t, lic in malas:
            print(f'Licencia inesperada en {t}: {lic!r}')
        sys.exit(1)

    os.makedirs(SALIDA, exist_ok=True)
    total = 0
    proporciones = []
    for nombre, t in lista:
        ii = metas[t]
        local = os.path.join(cache, nombre + '.png')
        if not os.path.exists(local):
            with open(local, 'wb') as f:
                f.write(pedir(ii['thumburl']))
            time.sleep(0.5)  # sin apurar a Commons
        carta, (w, h) = procesar(Image.open(local))
        proporciones.append(h / w)
        destino = os.path.join(SALIDA, nombre + '.webp')
        carta.save(destino, 'WEBP', quality=CALIDAD_DORSO if nombre == 'dorso' else CALIDAD, method=6)
        tam = os.path.getsize(destino)
        total += tam
        print(f'{nombre:12} {w}x{h} (alto/ancho {h / w:.3f}) -> {tam / 1024:.1f} KB')
    print(f'Proporción media alto/ancho: {sum(proporciones) / len(proporciones):.3f} (2:3 = 1.500)')
    print(f'Total: {total / 1024:.0f} KB en {len(lista)} archivos')


if __name__ == '__main__':
    main()
