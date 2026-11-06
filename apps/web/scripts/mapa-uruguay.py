"""
Modo historia: el mapa de Uruguay. A partir de los límites de los departamentos de Natural Earth
(ne_10m_admin_1_states_provinces, dominio público) arma:

- src/historia/geografia.ts: el camino SVG de cada departamento (proyectado y simplificado), su
  caja y su centro, y la proyección para ubicar lugares por latitud y longitud.
- packages/shared/src/vecinos.ts: qué departamentos limitan con cuál (los que comparten borde).

Uso (desde apps/web, con Python 3), con el GeoJSON bajado de
https://github.com/nvkelso/natural-earth-vector/tree/master/geojson:
    python scripts/mapa-uruguay.py ne_10m_admin_1_states_provinces.geojson
"""

import json
import math
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
MAPA = WEB / 'src' / 'historia' / 'geografia.ts'
VECINOS = WEB.parent.parent / 'packages' / 'shared' / 'src' / 'vecinos.ts'

ISO = {
    'UY-AR': 'artigas',
    'UY-CA': 'canelones',
    'UY-CL': 'cerro-largo',
    'UY-CO': 'colonia',
    'UY-DU': 'durazno',
    'UY-FS': 'flores',
    'UY-FD': 'florida',
    'UY-LA': 'lavalleja',
    'UY-MA': 'maldonado',
    'UY-MO': 'montevideo',
    'UY-PA': 'paysandu',
    'UY-RN': 'rio-negro',
    'UY-RV': 'rivera',
    'UY-RO': 'rocha',
    'UY-SA': 'salto',
    'UY-SJ': 'san-jose',
    'UY-SO': 'soriano',
    'UY-TA': 'tacuarembo',
    'UY-TT': 'treinta-y-tres',
}

# Artigas y Rivera se tocan en el arroyo Cuaró: en estos límites quedan a 1 km sin borde común.
EXTRA_VECINOS = [('artigas', 'rivera')]

ANCHO = 1000
# Proyección equirectangular centrada en la latitud media del país.
LAT0 = -32.6
COS = math.cos(math.radians(LAT0))
# Tolerancia de la simplificación, en unidades del mapa (1000 de ancho).
TOLERANCIA = 0.8


def clave(d):
    """Como clave de un objeto de TypeScript: entre comillas solo si tiene guiones."""
    return f"'{d}'" if '-' in d else d


def anillos(geometria):
    if geometria['type'] == 'Polygon':
        return [geometria['coordinates'][0]]
    return [poligono[0] for poligono in geometria['coordinates']]


def simplificar(puntos, tolerancia):
    """Ramer-Douglas-Peucker."""
    if len(puntos) < 3:
        return puntos
    (x1, y1), (x2, y2) = puntos[0], puntos[-1]
    dx, dy = x2 - x1, y2 - y1
    largo = math.hypot(dx, dy) or 1e-9
    peor, indice = 0, 0
    for i in range(1, len(puntos) - 1):
        x, y = puntos[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / largo
        if d > peor:
            peor, indice = d, i
    if peor <= tolerancia:
        return [puntos[0], puntos[-1]]
    return simplificar(puntos[: indice + 1], tolerancia)[:-1] + simplificar(puntos[indice:], tolerancia)


def main():
    datos = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    deps = {ISO[f['properties']['iso_3166_2']]: anillos(f['geometry']) for f in datos['features'] if f['properties'].get('adm0_a3') == 'URY'}
    assert len(deps) == 19, len(deps)

    todos = [p for rs in deps.values() for r in rs for p in r]
    lon_min = min(p[0] for p in todos)
    lat_max = max(p[1] for p in todos)
    ancho_geo = (max(p[0] for p in todos) - lon_min) * COS
    escala = ANCHO / ancho_geo
    alto = round((lat_max - min(p[1] for p in todos)) * escala)

    def proyectar(lon, lat):
        return ((lon - lon_min) * COS * escala, (lat_max - lat) * escala)

    # Vecinos: los que comparten al menos dos vértices del borde (Natural Earth los comparte exactos).
    vertices = {d: {(round(x, 5), round(y, 5)) for r in rs for x, y in r} for d, rs in deps.items()}
    vecinos = {d: {o for o in deps if o != d and len(vertices[d] & vertices[o]) >= 2} for d in deps}
    # Los que limitan por un tramo tan corto que en Natural Earth no comparten vértices.
    for a, b in EXTRA_VECINOS:
        vecinos[a].add(b)
        vecinos[b].add(a)
    vecinos = {d: sorted(vecinos[d]) for d in sorted(deps)}

    filas = []
    for d in sorted(deps):
        caminos = []
        xs, ys, area, cx, cy = [], [], 0.0, 0.0, 0.0
        for r in deps[d]:
            pts = [proyectar(lon, lat) for lon, lat in r[:-1]]
            # Un anillo cerrado se simplifica en dos mitades (si no, sus puntas son el mismo punto).
            mitad = len(pts) // 2
            pts = simplificar(pts[: mitad + 1], TOLERANCIA)[:-1] + simplificar(pts[mitad:] + pts[:1], TOLERANCIA)[:-1]
            caminos.append('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z')
            xs += [x for x, _ in pts]
            ys += [y for _, y in pts]
            for (xa, ya), (xb, yb) in zip(pts, pts[1:] + pts[:1]):
                c = xa * yb - xb * ya
                area += c
                cx += (xa + xb) * c
                cy += (ya + yb) * c
        centro = (cx / (3 * area), cy / (3 * area))
        caja = (min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys))
        filas.append(
            f"  {clave(d)}: {{\n    d: '{''.join(caminos)}',\n"
            f"    caja: [{caja[0]:.1f}, {caja[1]:.1f}, {caja[2]:.1f}, {caja[3]:.1f}],\n"
            f"    centro: [{centro[0]:.1f}, {centro[1]:.1f}],\n  }},"
        )

    MAPA.parent.mkdir(parents=True, exist_ok=True)
    MAPA.write_text(
        f"""/**
 * El mapa de Uruguay del modo historia: cada departamento con su camino SVG, su caja (x, y, ancho,
 * alto) y su centro, en un plano de {ANCHO} de ancho. Límites de Natural Earth (dominio público).
 *
 * Generado por scripts/mapa-uruguay.py: no editar a mano.
 */

import type {{ IdDepartamento }} from '@truco/shared'

export const ANCHO_MAPA = {ANCHO}
export const ALTO_MAPA = {alto}

export interface DepartamentoEnMapa {{
  d: string
  caja: readonly [number, number, number, number]
  centro: readonly [number, number]
}}

/** Un lugar (latitud, longitud) en el plano del mapa. */
export function proyectar([lat, lon]: readonly [number, number]): [number, number] {{
  return [(lon + {-lon_min:.6f}) * {COS * escala:.4f}, ({lat_max:.6f} - lat) * {escala:.4f}]
}}

export const MAPA_URUGUAY: Record<IdDepartamento, DepartamentoEnMapa> = {{
"""
        + '\n'.join(filas)
        + '\n}\n',
        encoding='utf-8',
        newline='\n',
    )

    VECINOS.write_text(
        """/**
 * Qué departamentos limitan con cuál: en el modo historia, completar uno abre sus vecinos.
 * Sale de los límites de Natural Earth (los que comparten borde).
 *
 * Generado por apps/web/scripts/mapa-uruguay.py: no editar a mano.
 */

import type { IdDepartamento } from './historia'

export const VECINOS: Record<IdDepartamento, readonly IdDepartamento[]> = {
"""
        + '\n'.join(f"  {clave(d)}: [{', '.join(repr(v) for v in vs)}]," for d, vs in vecinos.items())
        + '\n}\n',
        encoding='utf-8',
        newline='\n',
    )
    for d, vs in vecinos.items():
        print(d, '->', ', '.join(vs))
    print('mapa', ANCHO, 'x', alto, '·', MAPA.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
