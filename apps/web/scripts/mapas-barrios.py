"""
Modo historia: el mapa de cada barrio, armado con teselas de OpenStreetMap (© colaboradores de
OpenStreetMap, ODbL: hay que nombrarlos donde se muestra el mapa).

Uso (desde apps/web, con Python 3 y Pillow), con la lista de barrios en JSON:
    python scripts/mapas-barrios.py <barrios.json>

El JSON es una lista de { "departamento", "barrio", "lugares": [[lat, lon], ...], "margen"? } (los
lugares de sus niveles). Se saca de @truco/shared, desde apps/server:
    node_modules/.bin/tsx -e "import {HISTORIAS, barriosDe} from '@truco/shared'; ..."

Por cada barrio: el encuadre de sus lugares con margen (más ancho si el barrio trae `margen`), la
tesela más cerca posible que entre en 1400 px, la imagen en
public/departamentos/<departamento>/<barrio>/mapa.webp y, en src/historia/mapasBarrios.ts, su zoom y
su esquina (en píxeles del mundo a ese zoom) para ubicar los puntos con la misma proyección.
Correrlo de nuevo pisa todo. Pide las teselas de a una, sin apuro (política de uso de OSM).
"""

import io
import json
import math
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parent.parent
DESTINO = WEB / 'public' / 'departamentos'
TS = WEB / 'src' / 'historia' / 'mapasBarrios.ts'
UA = 'TrucoUruguayo-mapas/1.0 (mapas de los barrios del modo historia, descarga puntual)'
TESELA = 256
MAXIMO = 1400
MARGEN = 0.3


def mundo(lat, lon, z):
    """El punto en píxeles del mundo (Web Mercator) al zoom z."""
    n = TESELA * 2**z
    x = (lon + 180) / 360 * n
    s = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n
    return x, y


def encuadre(lugares, margen):
    lats = [p[0] for p in lugares]
    lons = [p[1] for p in lugares]
    alto = max(max(lats) - min(lats), 0.01)
    ancho = max(max(lons) - min(lons), 0.01)
    lat0, lat1 = min(lats) - alto * margen, max(lats) + alto * margen
    lon0, lon1 = min(lons) - ancho * margen, max(lons) + ancho * margen
    return lat0, lon0, lat1, lon1


def caja_en_pixeles(caja, z):
    lat0, lon0, lat1, lon1 = caja
    x0, y0 = mundo(lat1, lon0, z)
    x1, y1 = mundo(lat0, lon1, z)
    # Ni muy angosto ni muy alto: entre 3:4 y 4:3 (así entra bien en la pantalla).
    w, h = x1 - x0, y1 - y0
    if w / h < 0.75:
        extra = (0.75 * h - w) / 2
        x0, x1 = x0 - extra, x1 + extra
    elif w / h > 4 / 3:
        extra = (w * 3 / 4 - h) / 2
        y0, y1 = y0 - extra, y1 + extra
    return round(x0), round(y0), round(x1), round(y1)


def tesela(z, x, y):
    url = f'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    for intento in range(4):
        try:
            datos = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30).read()
            time.sleep(0.4)
            return Image.open(io.BytesIO(datos)).convert('RGB')
        except Exception as e:
            print('  reintento', z, x, y, e)
            time.sleep(3 * (intento + 1))
    raise SystemExit(f'No se pudo bajar la tesela {z}/{x}/{y}')


def mapa(barrio):
    caja = encuadre(barrio['lugares'], barrio.get('margen', MARGEN))
    z = 17
    while True:
        x0, y0, x1, y1 = caja_en_pixeles(caja, z)
        if x1 - x0 <= MAXIMO and y1 - y0 <= MAXIMO:
            break
        z -= 1
    imagen = Image.new('RGB', (x1 - x0, y1 - y0))
    for tx in range(x0 // TESELA, (x1 - 1) // TESELA + 1):
        for ty in range(y0 // TESELA, (y1 - 1) // TESELA + 1):
            imagen.paste(tesela(z, tx, ty), (tx * TESELA - x0, ty * TESELA - y0))
    carpeta = DESTINO / barrio['departamento'] / barrio['barrio']
    carpeta.mkdir(parents=True, exist_ok=True)
    imagen.save(carpeta / 'mapa.webp', 'WEBP', quality=82, method=6)
    print(f"{barrio['barrio']}: zoom {z}, {imagen.width} x {imagen.height}")
    return {'z': z, 'x': x0, 'y': y0, 'ancho': imagen.width, 'alto': imagen.height}


def main():
    barrios = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    filas = []
    for b in barrios:
        m = mapa(b)
        filas.append(f"  '{b['departamento']}/{b['barrio']}': {{ z: {m['z']}, x: {m['x']}, y: {m['y']}, ancho: {m['ancho']}, alto: {m['alto']} }},")
    TS.write_text(
        '/**\n'
        ' * El mapa de cada barrio (scripts/mapas-barrios.py, con teselas de OpenStreetMap): su zoom, su\n'
        ' * esquina de arriba a la izquierda en píxeles del mundo a ese zoom y su tamaño. La imagen está en\n'
        ' * public/departamentos/<departamento>/<barrio>/mapa.webp.\n'
        ' *\n'
        ' * Generado por scripts/mapas-barrios.py: no editar a mano.\n'
        ' */\n\n'
        'export interface MapaBarrio {\n  z: number\n  x: number\n  y: number\n  ancho: number\n  alto: number\n}\n\n'
        'export const MAPAS_BARRIOS: Record<string, MapaBarrio> = {\n' + '\n'.join(filas) + '\n}\n',
        encoding='utf-8',
        newline='\n',
    )
    print(f'{len(filas)} mapas')


if __name__ == '__main__':
    main()
