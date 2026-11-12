"""
Modo historia: los fondos de cada nivel (el lugar donde se juega). Copia los del paquete a
public/departamentos/<departamento>/ y arma src/estilos-niveles.css con todos los que hay ahí.
Un nivel sin fondo propio sigue con el de su departamento (estilos-departamentos.css).

Uso (desde apps/web, con Python 3), con el paquete descomprimido (o sin argumento, para solo
rehacer el CSS con lo que ya está en public):
    python scripts/fondos-niveles.py [carpeta del paquete] [--barrios-de <departamento>]

En el paquete hay una carpeta por departamento con nivel-<n>-horizontal.webp y
nivel-<n>-vertical.webp (1920 × 1080 y 1080 × 1920), más su CREDITOS.md y datos.md, que se
guardan junto a los fondos. Con --barrios-de, cada carpeta del paquete es un barrio de ese
departamento y va a public/departamentos/<departamento>/<barrio>/ (en el CSS, con `data-barrio`).

De cada fondo de un barrio se hace además `nivel-<n>-mini.webp` (un cuadrado de 200 px del centro del
horizontal): las fotos que van pasando en el redondel de cada barrio, en el mapa del departamento.
"""

import re
import shutil
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
DESTINO = WEB / 'public' / 'departamentos'
CSS = WEB / 'src' / 'estilos-niveles.css'

ENCABEZADO = """/*
 * El fondo de cada nivel del modo historia (el lugar donde se juega): pisa el del departamento en
 * la previa y en el mapa del departamento (`data-fondo` y `data-nivel`) y en la partida
 * (`data-lugar` y `data-nivel` en <html>). Los niveles que no están acá usan el del departamento.
 *
 * Generado por scripts/fondos-niveles.py: no editar a mano.
 */
"""


def regla(dep, barrio, n):
    base = f'/departamentos/{dep}/{barrio + "/" if barrio else ""}nivel-{n}'
    b = f"[data-barrio='{barrio}']" if barrio else ''
    selectores = f"[data-fondo='{dep}']{b}[data-nivel='{n}'],\n:root[data-lugar='{dep}']{b}[data-nivel='{n}'] body"
    vertical = selectores.replace('\n', '\n  ')
    return f"""
{selectores} {{
  --fondo-lugar: url('{base}-horizontal.webp');
}}
@media (orientation: portrait) {{
  {vertical} {{
    --fondo-lugar: url('{base}-vertical.webp');
  }}
}}
"""


def minis():
    """Las miniaturas de los fondos de los barrios (las que falten o estén viejas)."""
    from PIL import Image
    hechas = 0
    for horizontal in DESTINO.glob('*/*/nivel-*-horizontal.webp'):
        mini = horizontal.with_name(horizontal.name.replace('-horizontal', '-mini'))
        if mini.exists() and mini.stat().st_mtime >= horizontal.stat().st_mtime:
            continue
        imagen = Image.open(horizontal).convert('RGB')
        lado = min(imagen.size)
        x = (imagen.width - lado) // 2
        imagen.crop((x, 0, x + lado, lado)).resize((200, 200), Image.LANCZOS).save(mini, 'WEBP', quality=80, method=6)
        hechas += 1
    print(f'{hechas} miniaturas')


def main():
    args = sys.argv[1:]
    barrios_de = None
    if '--barrios-de' in args:
        i = args.index('--barrios-de')
        barrios_de = args[i + 1]
        del args[i : i + 2]
    if args:
        paquete = Path(args[0])
        for carpeta in sorted(p for p in paquete.iterdir() if p.is_dir()):
            fondos = sorted(carpeta.glob('nivel-*-*.webp'))
            if not fondos:
                continue
            destino = DESTINO / barrios_de / carpeta.name if barrios_de else DESTINO / carpeta.name
            destino.mkdir(parents=True, exist_ok=True)
            for archivo in fondos:
                shutil.copyfile(archivo, destino / archivo.name)
            for extra in ('datos.md', 'CREDITOS.md'):
                origen = carpeta / extra if (carpeta / extra).exists() else paquete / extra
                if origen.exists():
                    shutil.copyfile(origen, destino / extra)
            print(f'{carpeta.name}: {len(fondos)} fondos')

    reglas = []
    for horizontal in [*DESTINO.glob('*/nivel-*-horizontal.webp'), *DESTINO.glob('*/*/nivel-*-horizontal.webp')]:
        n = int(re.match(r'nivel-(\d+)-horizontal', horizontal.name).group(1))
        partes = horizontal.parent.relative_to(DESTINO).parts
        dep, barrio = partes[0], (partes[1] if len(partes) > 1 else '')
        assert (horizontal.parent / f'nivel-{n}-vertical.webp').exists(), f'Falta el vertical de {dep} {barrio} {n}'
        reglas.append((dep, barrio, n))
    reglas.sort()
    CSS.write_text(ENCABEZADO + ''.join(regla(d, b, n) for d, b, n in reglas), encoding='utf-8', newline='\n')
    print(f'{len(reglas)} niveles con fondo propio')
    minis()


if __name__ == '__main__':
    main()
