"""
Modo historia: los fondos de cada nivel (el lugar donde se juega). Copia los del paquete a
public/departamentos/<departamento>/ y arma src/estilos-niveles.css con todos los que hay ahí.
Un nivel sin fondo propio sigue con el de su departamento (estilos-departamentos.css).

Uso (desde apps/web, con Python 3), con el paquete descomprimido (o sin argumento, para solo
rehacer el CSS con lo que ya está en public):
    python scripts/fondos-niveles.py [carpeta del paquete]

En el paquete hay una carpeta por departamento con nivel-<n>-horizontal.webp y
nivel-<n>-vertical.webp (1920 × 1080 y 1080 × 1920), más su CREDITOS.md y datos.md, que se
guardan junto a los fondos.
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


def regla(dep, n):
    base = f'/departamentos/{dep}/nivel-{n}'
    selectores = f"[data-fondo='{dep}'][data-nivel='{n}'],\n:root[data-lugar='{dep}'][data-nivel='{n}'] body"
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


def main():
    if len(sys.argv) > 1:
        paquete = Path(sys.argv[1])
        for carpeta in sorted(p for p in paquete.iterdir() if p.is_dir()):
            fondos = sorted(carpeta.glob('nivel-*-*.webp'))
            if not fondos:
                continue
            destino = DESTINO / carpeta.name
            destino.mkdir(parents=True, exist_ok=True)
            for archivo in fondos:
                shutil.copyfile(archivo, destino / archivo.name)
            for extra in ('datos.md', 'CREDITOS.md'):
                origen = carpeta / extra if (carpeta / extra).exists() else paquete / extra
                if origen.exists():
                    shutil.copyfile(origen, destino / extra)
            print(f'{carpeta.name}: {len(fondos)} fondos')

    reglas = []
    for horizontal in sorted(DESTINO.glob('*/nivel-*-horizontal.webp')):
        n = int(re.match(r'nivel-(\d+)-horizontal', horizontal.name).group(1))
        dep = horizontal.parent.name
        assert (horizontal.parent / f'nivel-{n}-vertical.webp').exists(), f'Falta el vertical de {dep} {n}'
        reglas.append((dep, n))
    reglas.sort()
    CSS.write_text(ENCABEZADO + ''.join(regla(d, n) for d, n in reglas), encoding='utf-8', newline='\n')
    print(f'{len(reglas)} niveles con fondo propio')


if __name__ == '__main__':
    main()
