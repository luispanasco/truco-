"""
Modo historia: importa el paquete de los 19 departamentos (paño, fondos y colores de cada uno) y
arma src/estilos-departamentos.css. Los mazos van aparte (ver barajas-propias-cortes.py).

Uso (desde apps/web, con Python 3 y Pillow), con el paquete descomprimido:
    python scripts/departamentos.py <carpeta del paquete>

En la carpeta hay una por departamento (artigas, cerro-largo, …) con pano.webp (1024 × 1024, se
repite sin estirar), fondo-horizontal.webp (1920 × 1080), fondo-vertical.webp (1080 × 1920) y
colores.txt (pano-centro, pano-borde, madera y madera-oscura). Deja en public/departamentos/:
<id>-pano.webp, <id>-horizontal.webp, <id>-vertical.webp y <id>-mini.webp (el fondo chico, para
el mapa). Correrlo de nuevo con un paquete nuevo pisa todo.
"""

import shutil
import sys
from pathlib import Path

from PIL import Image

WEB = Path(__file__).resolve().parent.parent
DESTINO = WEB / 'public' / 'departamentos'
CSS = WEB / 'src' / 'estilos-departamentos.css'

DEPARTAMENTOS = [
    'artigas',
    'canelones',
    'cerro-largo',
    'colonia',
    'durazno',
    'flores',
    'florida',
    'lavalleja',
    'maldonado',
    'montevideo',
    'paysandu',
    'rio-negro',
    'rivera',
    'rocha',
    'salto',
    'san-jose',
    'soriano',
    'tacuarembo',
    'treinta-y-tres',
]

ENCABEZADO = """/*
 * Los 19 departamentos del modo historia: la mesa de cada uno (el paño repetido, con una viñeta
 * de su color de borde, y la madera) y su fondo (horizontal o vertical, según la pantalla).
 *
 * Generado por scripts/departamentos.py a partir del paquete de cada lugar: no editar a mano.
 */
"""


def colores(carpeta):
    pares = (linea.split(':', 1) for linea in (carpeta / 'colores.txt').read_text(encoding='utf-8').splitlines() if ':' in linea)
    return {k.strip(): v.strip() for k, v in pares}


def mini(origen, destino):
    imagen = Image.open(origen).convert('RGB')
    imagen.thumbnail((480, 480))
    imagen.save(destino, 'WEBP', quality=78, method=6)


def regla(id, c):
    return f"""
[data-mesa='{id}']:is(:root, .muestra-mesa) {{
  --tapete: {c['pano-centro']};
  --tapete-oscuro: {c['pano-borde']};
  --tapete-textura:
    radial-gradient(ellipse at center, transparent 35%, color-mix(in srgb, {c['pano-borde']} 85%, transparent)),
    url('/departamentos/{id}-pano.webp') center / 512px repeat;
  --madera: {c['madera-oscura']};
  --madera-clara: {c['madera']};
  --fondo-claro: {c['madera']};
}}

[data-fondo='{id}'],
:root[data-lugar='{id}'] body {{
  --fondo-lugar: url('/departamentos/{id}-horizontal.webp');
  --fondo-mini: url('/departamentos/{id}-mini.webp');
}}
@media (orientation: portrait) {{
  [data-fondo='{id}'],
  :root[data-lugar='{id}'] body {{
    --fondo-lugar: url('/departamentos/{id}-vertical.webp');
  }}
}}
"""


def main():
    paquete = Path(sys.argv[1])
    DESTINO.mkdir(parents=True, exist_ok=True)
    css = [ENCABEZADO]
    barras = []
    for id in DEPARTAMENTOS:
        carpeta = paquete / id
        shutil.copyfile(carpeta / 'pano.webp', DESTINO / f'{id}-pano.webp')
        shutil.copyfile(carpeta / 'fondo-horizontal.webp', DESTINO / f'{id}-horizontal.webp')
        shutil.copyfile(carpeta / 'fondo-vertical.webp', DESTINO / f'{id}-vertical.webp')
        mini(carpeta / 'fondo-horizontal.webp', DESTINO / f'{id}-mini.webp')
        c = colores(carpeta)
        css.append(regla(id, c))
        barras.append(f"  '{id}': '{c['pano-borde']}',")
    CSS.write_text(''.join(css), encoding='utf-8', newline='\n')
    print(f'{len(DEPARTAMENTOS)} departamentos. Para BARRA_MESA (temaMesa.ts):')
    print('\n'.join(barras))


if __name__ == '__main__':
    main()
