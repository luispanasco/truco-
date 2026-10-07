# "El Cid" (Simeón Durá, Valencia, 1888)

Las 40 cartas y el dorso de esta carpeta son escaneos de un naipe español de 48 cartas impreso en
1888 por la fábrica de Simeón Durá, en Valencia. Algunas cartas traen leyendas de la fábrica
("Premio al mérito", "Fca. de naipes finos El Cid", "Año de 1888", "Ahí vá").

- **Original:** Biblioteca Nacional de Francia, colección de juegos de cartas (fue de Paul
  Marteau). Ficha en Gallica: <https://gallica.bnf.fr/ark:/12148/btv1b10532628b>.
- **Fuente:** Wikimedia Commons, categoría
  [Jeu de cartes au portrait espagnol dit "El Cid"](https://commons.wikimedia.org/wiki/Category:Jeu_de_cartes_au_portrait_espagnol_dit_%22El_Cid%22_-_estampe_-_btv1b10532628b).
  El escaneo trae las 48 cartas, cada una seguida de su reverso (96 archivos `(NN of 96).jpg`):
  oros, copas, espadas y bastos, del 1 al 12. Se usan las 40 del truco y, como dorso, el `(02 of 96)`.
- **Licencia:** dominio público (en Commons: "Public domain"). Gallica pide una licencia para el uso
  comercial de sus escaneos; por ahora la baraja es gratis en la app. Antes de venderla en la tienda,
  consultar a la biblioteca.

## Cómo se generaron

Con `apps/web/scripts/baraja-gallica.py cid1888` (Python 3 + Pillow): baja de Commons las
miniaturas de 960 px de ancho, verifica que la licencia de cada archivo sea "Public domain", saca
un poco del canto, lleva cada carta a 400 × 600 (2:3) centrada en el marco impreso y la guarda en
WebP (calidad 80; el dorso, 60).
