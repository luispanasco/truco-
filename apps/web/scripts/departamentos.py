"""
Modo historia: importa el paquete de los 19 departamentos (paño, fondos y colores de cada uno) y
arma src/estilos-departamentos.css. Los mazos van aparte (ver barajas-propias-cortes.py).

Uso (desde apps/web, con Python 3 y Pillow), con el paquete descomprimido:
    python scripts/departamentos.py <carpeta del paquete>
    python scripts/departamentos.py --panos <carpeta de los paños>

En la carpeta hay una por departamento (artigas, cerro-largo, …) con pano.webp (1024 × 1024, se
repite sin estirar), fondo-horizontal.webp (1920 × 1080), fondo-vertical.webp (1080 × 1920) y
colores.txt (pano-centro, pano-borde, madera y madera-oscura). Deja en public/departamentos/:
<id>-pano.webp, <id>-horizontal.webp, <id>-vertical.webp y <id>-mini.webp (el fondo chico, para
el mapa). Correrlo de nuevo con un paquete nuevo pisa todo.

Con --panos importa solo los paños nuevos (INSTRUCTIVO-PANOS.md): en la carpeta, una por
departamento que tenga, con pano.webp (1024 × 1024) y, si hay, emblema.png (1024 × 1024, de un color
claro sobre transparente). Deja <id>-pano.webp y <id>-emblema.webp, y suma el emblema a la mesa de
ese departamento en el CSS: centrado, al 55 % del ancho, abajo de la viñeta y arriba del paño. La
opacidad del 10 % va ya en la imagen (una capa de fondo no tiene opacidad propia).

Las mesas nuevas (INSTRUCTIVO-MESAS.md) traen además bordado.png (el bordado del centro, en color),
marco.png (la madera tallada, banda de 160 px, para `border-image`) y colores.json (pano, panoOscuro,
madera, maderaClara). Con eso la regla de la mesa se arma de nuevo: el bordado reemplaza al emblema
(al 55 % del ancho y, en vertical, al 85 %, con su opacidad ya en la imagen), el marco va en
`--tapete-marco` y los colores salen del json.
"""

import json
import re
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

# El emblema: su opacidad en la mesa y su lado (se ve al 55 % del ancho de la mesa: sobra para pantallas densas).
OPACIDAD_EMBLEMA = 0.10
LADO_EMBLEMA = 768
# El bordado del centro: casi entero (se ve el hilo), un poco transparente para que no compita con las cartas.
OPACIDAD_BORDADO = 0.8
LADO_BORDADO = 900
# El marco: la banda de madera mide 160 px en la imagen y se ve de 22 px en la mesa.
CORTE_MARCO = 160
ANCHO_MARCO = '22px'

ENCABEZADO = """/*
 * Los 19 departamentos del modo historia: la mesa de cada uno (el paño repetido, con una viñeta
 * de su color de borde, y la madera) y su fondo: `--fondo-lugar` (horizontal o vertical, según la
 * pantalla), `--fondo-ancho` (siempre el horizontal) y `--fondo-mini` (el chico, para el mapa).
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


def capa_emblema(id):
    return f"    url('/departamentos/{id}-emblema.webp') center / 55% auto no-repeat,\n"


def regla(id, c):
    emblema = capa_emblema(id) if (DESTINO / f'{id}-emblema.webp').exists() else ''
    return f"""
[data-mesa='{id}']:is(:root, .muestra-mesa) {{
  --tapete: {c['pano-centro']};
  --tapete-oscuro: {c['pano-borde']};
  --tapete-textura:
    radial-gradient(ellipse at center, transparent 35%, color-mix(in srgb, {c['pano-borde']} 85%, transparent)),
{emblema}    url('/departamentos/{id}-pano.webp') center / 512px repeat;
  --madera: {c['madera-oscura']};
  --madera-clara: {c['madera']};
  --fondo-claro: {c['madera']};
}}

[data-fondo='{id}'],
:root[data-lugar='{id}'] body {{
  --fondo-lugar: url('/departamentos/{id}-horizontal.webp');
  --fondo-ancho: url('/departamentos/{id}-horizontal.webp');
  --fondo-mini: url('/departamentos/{id}-mini.webp');
}}
@media (orientation: portrait) {{
  [data-fondo='{id}'],
  :root[data-lugar='{id}'] body {{
    --fondo-lugar: url('/departamentos/{id}-vertical.webp');
  }}
}}
"""


def pano(origen, destino):
    """El paño, liviano: WebP con pérdida a calidad 100 conserva el grano del fieltro (el original viene sin pérdida)."""
    Image.open(origen).convert('RGB').save(destino, 'WEBP', quality=100, method=6)


def emblema(origen, destino):
    """El emblema con la opacidad de la mesa ya aplicada."""
    imagen = Image.open(origen).convert('RGBA')
    imagen.thumbnail((LADO_EMBLEMA, LADO_EMBLEMA), Image.LANCZOS)
    imagen.putalpha(imagen.getchannel('A').point(lambda a: round(a * OPACIDAD_EMBLEMA)))
    imagen.save(destino, 'WEBP', lossless=True, method=6)


def con_opacidad(origen, destino, lado, opacidad):
    imagen = Image.open(origen).convert('RGBA')
    imagen.thumbnail((lado, lado), Image.LANCZOS)
    if opacidad < 1:
        imagen.putalpha(imagen.getchannel('A').point(lambda a: round(a * opacidad)))
    imagen.save(destino, 'WEBP', quality=92, method=6)


def regla_mesa(id, c):
    """La mesa nueva: paño, bordado al centro, marco tallado y sus colores."""
    textura = lambda tam: f"""
    radial-gradient(ellipse at center, transparent 35%, color-mix(in srgb, {c['panoOscuro']} 85%, transparent)),
    url('/departamentos/{id}-bordado.webp') center / {tam} auto no-repeat,
    url('/departamentos/{id}-pano.webp') center / 512px repeat;"""
    return f"""[data-mesa='{id}']:is(:root, .muestra-mesa) {{
  --tapete: {c['pano']};
  --tapete-oscuro: {c['panoOscuro']};
  --tapete-textura:{textura('55%')}
  --tapete-marco: url('/departamentos/{id}-marco.webp') {CORTE_MARCO} / {ANCHO_MARCO} round;
  --madera: {c['madera']};
  --madera-clara: {c['maderaClara']};
  --fondo-claro: {c['maderaClara']};
}}
/* En vertical la mesa es angosta: el bordado más grande, para que se vea entre las cartas. */
@media (orientation: portrait) {{
  [data-mesa='{id}']:is(:root, .muestra-mesa) {{
    --tapete-textura:{textura('85%')}
  }}
}}
"""


def importar_mesa(carpeta, id, css):
    """Una mesa nueva completa: copia las imágenes y reemplaza su regla en el CSS."""
    c = json.loads((carpeta / 'colores.json').read_text(encoding='utf-8'))
    # El paño nuevo tiene dibujo (no solo grano): a calidad 85 pesa un tercio y no se nota.
    Image.open(carpeta / 'pano.webp').convert('RGB').save(DESTINO / f'{id}-pano.webp', 'WEBP', quality=85, method=6)
    con_opacidad(carpeta / 'bordado.png', DESTINO / f'{id}-bordado.webp', LADO_BORDADO, OPACIDAD_BORDADO)
    Image.open(carpeta / 'marco.png').convert('RGBA').save(DESTINO / f'{id}-marco.webp', 'WEBP', quality=92, method=6)
    (DESTINO / f'{id}-emblema.webp').unlink(missing_ok=True)
    # La regla vieja (con su media query de mesa, si ya era nueva) sale entera.
    vieja = re.compile(
        rf"\[data-mesa='{id}'\]:is\(:root, \.muestra-mesa\) \{{.*?\n\}}\n"
        rf"(/\* En vertical.*?\n@media \(orientation: portrait\) \{{\n  \[data-mesa='{id}'\].*?\n  \}}\n\}}\n)?",
        re.S,
    )
    css, n = vieja.subn(lambda _: regla_mesa(id, c), css, count=1)
    if n != 1:
        raise SystemExit(f'{id}: no encontré su regla en el CSS')
    return css


def importar_panos(carpeta):
    css = CSS.read_text(encoding='utf-8')
    for id in DEPARTAMENTOS:
        if not (carpeta / id / 'pano.webp').exists():
            continue
        pano(carpeta / id / 'pano.webp', DESTINO / f'{id}-pano.webp')
        if all((carpeta / id / f).exists() for f in ('bordado.png', 'marco.png', 'colores.json')):
            css = importar_mesa(carpeta / id, id, css)
            print(f'{id}: mesa nueva (paño, bordado, marco y colores)')
            continue
        hay_emblema = (carpeta / id / 'emblema.png').exists()
        if hay_emblema:
            emblema(carpeta / id / 'emblema.png', DESTINO / f'{id}-emblema.webp')
            capa = capa_emblema(id)
            linea_pano = f"    url('/departamentos/{id}-pano.webp') center / 512px repeat;"
            if capa not in css:
                css = css.replace(linea_pano, capa + linea_pano)
        print(f'{id}: paño' + (' y emblema' if hay_emblema else ''))
    CSS.write_text(css, encoding='utf-8', newline='\n')


def main():
    if sys.argv[1] == '--panos':
        importar_panos(Path(sys.argv[2]))
        return
    paquete = Path(sys.argv[1])
    DESTINO.mkdir(parents=True, exist_ok=True)
    css = [ENCABEZADO]
    barras = []
    for id in DEPARTAMENTOS:
        carpeta = paquete / id
        shutil.copyfile(carpeta / 'pano.webp', DESTINO / f'{id}-pano.webp')
        if (carpeta / 'emblema.png').exists():
            emblema(carpeta / 'emblema.png', DESTINO / f'{id}-emblema.webp')
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
