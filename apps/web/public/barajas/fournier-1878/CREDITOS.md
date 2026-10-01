# Baraja clásica (Heraclio Fournier, 1878)

Las 40 cartas y el dorso de esta carpeta son escaneos de un naipe español impreso en 1878.

- **Diseño:** Ignacio Díaz de Olano y Emilio Soubrier.
- **Impresión:** Heraclio Fournier (Vitoria, 1878).
- **Original:** Museo Fournier de Naipes de Álava (Bibat, Vitoria-Gasteiz), ref. 44470. Según
  la descripción de Commons, la baraja fue del comandante Manuel Cánovas, que jugó con ella con
  Carlos VII en el exilio después de la Segunda Guerra Carlista.
- **Fuente:** Wikimedia Commons, categoría
  [Heraclio Fournier’s 1878 card deck](https://commons.wikimedia.org/wiki/Category:Heraclio_Fournier%E2%80%99s_1878_card_deck).
  Cada imagen sale del archivo `File:Fournier 1878 - <número> <palo> (ref. 44470).png` (en
  euskera: bateko, biko, hiruko, lauko, bosteko, seiko, zazpiko, txota, zaldi, errege; bastoia,
  ezpata, kopa, urrea), y el dorso de `File:Fournier 1878 - Atzealdea (ref. 44470).png`. Por
  ejemplo: <https://commons.wikimedia.org/wiki/File:Fournier_1878_-_bateko_ezpata_(ref._44470).png>.
- **Licencia:** dominio público (en Commons: "Public domain", plantillas PD-Old y
  CC-PD-Mark). No exige atribución; igual la damos acá y en el selector de baraja
  ("Fournier 1878 · dominio público").

## Cómo se generaron

Con `apps/web/scripts/baraja-fournier.py` (Python 3 + Pillow): baja de Commons las miniaturas de
960 px de ancho (no los originales), verifica que la licencia de cada archivo sea "Public
domain", recorta el canto gastado, centra en el marco impreso, lleva cada carta a 400 × 600
(2:3, recortando un poco del margen blanco de arriba y de abajo, porque la carta real es algo
más alta: alto/ancho ≈ 1,61) y la guarda en WebP (calidad 80; el dorso, 60).
