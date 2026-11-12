"""
Modo historia: el mapa de cada barrio, dibujado en vector con los datos de OpenStreetMap
(© colaboradores de OpenStreetMap, ODbL: hay que nombrarlos donde se muestra el mapa).

Uso (desde apps/web, con Python 3 y shapely), con la lista de barrios en JSON:
    python scripts/mapas-barrios.py <barrios.json>

El JSON es una lista de { "departamento", "barrio", "lugares": [[lat, lon], ...], "margen"? } (los
lugares de sus niveles). Se saca de @truco/shared, desde apps/server, con un script de tsx que
recorra `barriosDe(HISTORIAS.rocha!)` (ver la bitácora).

Por cada barrio: el encuadre de sus lugares con margen (más ancho si el barrio trae `margen`); de la
API de Overpass, la costa, el agua, los arroyos, los montes, la arena, los bañados, los pueblos y las
rutas; el mar se arma partiendo el encuadre con la costa (en OpenStreetMap la tierra queda a la
izquierda de la línea). Se dibuja con la paleta del juego, sin nombres, en
public/departamentos/<departamento>/<barrio>/mapa.svg; las coordenadas son píxeles del mundo (Web
Mercator) al zoom del barrio, menos su esquina, que van en src/historia/mapasBarrios.ts para ubicar los
puntos con la misma proyección. Correrlo de nuevo pisa todo.
"""

import json
import math
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box
from shapely.ops import linemerge, polygonize, unary_union

WEB = Path(__file__).resolve().parent.parent
DESTINO = WEB / 'public' / 'departamentos'
TS = WEB / 'src' / 'historia' / 'mapasBarrios.ts'
UA = 'TrucoUruguayo-mapas/1.0 (mapas de los barrios del modo historia, consulta puntual)'
OVERPASS = 'https://overpass-api.de/api/interpreter'
TESELA = 256
MAXIMO = 1400
MARGEN = 0.3

# La paleta: carta náutica vieja, en los tonos de los fondos del juego.
COLORES = {
    'tierra': '#eadcbc',
    'mar': '#4d7b78',
    'agua': '#6a9890',
    'arena': '#ecc988',
    'monte': '#a9ab73',
    'banado': '#c6c08c',
    'pueblo': '#d9c09a',
    'ruta': '#b0885a',
    'calle': '#cdb08a',
    'costa': '#7a5a38',
}


def mundo(lat, lon, z):
    """El punto en píxeles del mundo (Web Mercator) al zoom z."""
    n = TESELA * 2**z
    s = math.sin(math.radians(lat))
    return (lon + 180) / 360 * n, (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n


def encuadre(lugares, margen):
    lats = [p[0] for p in lugares]
    lons = [p[1] for p in lugares]
    alto = max(max(lats) - min(lats), 0.01)
    ancho = max(max(lons) - min(lons), 0.01)
    return min(lats) - alto * margen, min(lons) - ancho * margen, max(lats) + alto * margen, max(lons) + ancho * margen


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


def a_latlon(x, y, z):
    n = TESELA * 2**z
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n)))), x / n * 360 - 180


def consultar(sur, oeste, norte, este, con_calles):
    b = f'{sur},{oeste},{norte},{este}'
    calles = '|residential|unclassified|living_street' if con_calles else ''
    q = f"""[out:json][timeout:120];
(
  way["natural"="coastline"]({b});
  way["natural"~"^(water|wood|scrub|wetland|beach|sand)$"]({b});
  relation["natural"~"^(water|wood|wetland|beach|sand)$"]({b});
  way["landuse"~"^(forest|residential)$"]({b});
  relation["landuse"~"^(forest|residential)$"]({b});
  way["waterway"~"^(river|stream|canal)$"]({b});
  way["highway"~"^(trunk|primary|secondary|tertiary{calles})$"]({b});
);
out geom;"""
    for intento in range(4):
        try:
            datos = urllib.request.urlopen(
                urllib.request.Request(OVERPASS, data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': UA}), timeout=180
            ).read()
            return json.loads(datos)['elements']
        except Exception as e:
            print('  reintento Overpass', e)
            time.sleep(10 * (intento + 1))
    raise SystemExit('Overpass no contestó')


def clase(tags):
    n, l = tags.get('natural'), tags.get('landuse')
    if n == 'coastline':
        return 'costa'
    if n == 'water':
        return 'agua'
    if n in ('wood', 'scrub') or l == 'forest':
        return 'monte'
    if n == 'wetland':
        return 'banado'
    if n in ('beach', 'sand'):
        return 'arena'
    if l == 'residential':
        return 'pueblo'
    if 'waterway' in tags:
        return 'arroyo'
    h = tags.get('highway')
    if h in ('trunk', 'primary', 'secondary'):
        return 'ruta'
    if h:
        return 'calle'
    return None


def linea(geom):
    return [(p['lon'], p['lat']) for p in geom]


def poligono_de_relacion(el):
    afuera, adentro = [], []
    for m in el.get('members', []):
        if m.get('type') != 'way' or 'geometry' not in m:
            continue
        (adentro if m.get('role') == 'inner' else afuera).append(LineString(linea(m['geometry'])))
    if not afuera:
        return None
    exterior = unary_union(list(polygonize(linemerge(afuera) if len(afuera) > 1 else afuera)))
    if adentro:
        exterior = exterior.difference(unary_union(list(polygonize(linemerge(adentro) if len(adentro) > 1 else adentro))))
    return exterior


def lado(p, costa):
    """+1 si `p` queda a la izquierda del tramo de costa más cercano (tierra), -1 si a la derecha (mar)."""
    mejor, signo = float('inf'), 1
    for l in costa:
        c = list(l.coords)
        for a, b in zip(c, c[1:]):
            seg = LineString([a, b])
            d = seg.distance(p)
            if d < mejor:
                mejor = d
                cruz = (b[0] - a[0]) * (p.y - a[1]) - (b[1] - a[1]) * (p.x - a[0])
                signo = 1 if cruz > 0 else -1
    return signo


def a_svg(geom, z, x0, y0, tol):
    """La geometría (en lon/lat) en un `d` de SVG, en píxeles del mapa, simplificada."""
    def pts(coords):
        out = []
        for lon, lat in coords:
            x, y = mundo(lat, lon, z)
            out.append((x - x0, y - y0))
        return out

    partes = []

    def anillo(coords, cerrar):
        p = LineString(pts(coords)).simplify(tol) if len(coords) > 2 else LineString(pts(coords))
        c = list(p.coords)
        if len(c) < 2:
            return
        partes.append('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in c) + ('Z' if cerrar else ''))

    def una(g):
        if g.is_empty:
            return
        if g.geom_type == 'Polygon':
            anillo(g.exterior.coords, True)
            for i in g.interiors:
                anillo(i.coords, True)
        elif g.geom_type == 'LineString':
            anillo(g.coords, False)
        elif hasattr(g, 'geoms'):
            for h in g.geoms:
                una(h)

    una(geom)
    return ''.join(partes)


def mapa(barrio):
    lat0, lon0, lat1, lon1 = encuadre(barrio['lugares'], barrio.get('margen', MARGEN))
    z = 17
    while True:
        x0, y0, x1, y1 = caja_en_pixeles((lat0, lon0, lat1, lon1), z)
        if x1 - x0 <= MAXIMO and y1 - y0 <= MAXIMO:
            break
        z -= 1
    # El encuadre final (con el ajuste de proporción), en lon/lat.
    norte, oeste = a_latlon(x0, y0, z)
    sur, este = a_latlon(x1, y1, z)
    elementos = consultar(sur, oeste, norte, este, con_calles=z >= 13)
    marco = box(oeste, sur, este, norte)

    capas = {k: [] for k in ('agua', 'monte', 'banado', 'arena', 'pueblo', 'arroyo', 'ruta', 'calle')}
    costa = []
    for el in elementos:
        c = clase(el.get('tags', {}))
        if not c:
            continue
        if el['type'] == 'relation':
            g = poligono_de_relacion(el)
            if g is not None and not g.is_empty:
                capas.setdefault(c, []).append(g)
            continue
        coords = linea(el.get('geometry', []))
        if len(coords) < 2:
            continue
        if c == 'costa':
            costa.append(LineString(coords))
        elif c in ('arroyo', 'ruta', 'calle'):
            capas[c].append(LineString(coords))
        elif len(coords) >= 4 and coords[0] == coords[-1]:
            capas[c].append(Polygon(coords).buffer(0))

    # El mar: el encuadre partido por la costa; cada pedazo es mar o tierra según de qué lado de la costa queda.
    mar = []
    if costa:
        cortes = unary_union([marco.exterior] + [l.intersection(marco.buffer(1e-6)) for l in costa])
        for cara in polygonize(cortes):
            if lado(cara.representative_point(), costa) < 0:
                mar.append(cara)

    tol = 0.6
    d = lambda g: a_svg(g.intersection(marco), z, x0, y0, tol)
    capas_svg = []
    if mar:
        capas_svg.append(f'<path d="{d(unary_union(mar))}" fill="{COLORES["mar"]}"/>')
    for nombre, color in (('banado', 'banado'), ('monte', 'monte'), ('arena', 'arena'), ('pueblo', 'pueblo'), ('agua', 'agua')):
        if capas[nombre]:
            capas_svg.append(f'<path d="{d(unary_union(capas[nombre]))}" fill="{COLORES[color]}" fill-rule="evenodd"/>')
    trazos = (
        ('arroyo', COLORES['agua'], 1.6),
        ('calle', COLORES['calle'], 0.8),
        ('ruta', COLORES['ruta'], 1.8),
    )
    for nombre, color, ancho in trazos:
        if capas[nombre]:
            capas_svg.append(
                f'<path d="{d(unary_union(capas[nombre]))}" fill="none" stroke="{color}" stroke-width="{ancho}" '
                'stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'
            )
    if costa:
        capas_svg.append(
            f'<path d="{d(unary_union(costa))}" fill="none" stroke="{COLORES["costa"]}" stroke-width="1.4" '
            'stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'
        )
    ancho, alto = x1 - x0, y1 - y0
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" width="{ancho}" height="{alto}">'
        f'<rect width="{ancho}" height="{alto}" fill="{COLORES["tierra"]}"/>' + ''.join(capas_svg) + '</svg>'
    )
    carpeta = DESTINO / barrio['departamento'] / barrio['barrio']
    carpeta.mkdir(parents=True, exist_ok=True)
    (carpeta / 'mapa.svg').write_text(svg, encoding='utf-8')
    (carpeta / 'mapa.webp').unlink(missing_ok=True)
    print(f"{barrio['barrio']}: zoom {z}, {ancho} x {alto}, {len(svg) // 1024} KB, {len(mar)} pedazos de mar")
    return {'z': z, 'x': x0, 'y': y0, 'ancho': ancho, 'alto': alto}


def main():
    barrios = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    filas = []
    for b in barrios:
        m = mapa(b)
        filas.append(f"  '{b['departamento']}/{b['barrio']}': {{ z: {m['z']}, x: {m['x']}, y: {m['y']}, ancho: {m['ancho']}, alto: {m['alto']} }},")
        time.sleep(2)
    TS.write_text(
        '/**\n'
        ' * El mapa de cada barrio (scripts/mapas-barrios.py, dibujado con los datos de OpenStreetMap): su\n'
        ' * zoom, su esquina de arriba a la izquierda en píxeles del mundo a ese zoom y su tamaño. El dibujo\n'
        ' * está en public/departamentos/<departamento>/<barrio>/mapa.svg.\n'
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
