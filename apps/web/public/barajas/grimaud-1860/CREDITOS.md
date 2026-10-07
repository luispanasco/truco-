# Baraja de B. P. Grimaud (Francia, 1860)

Las 40 cartas y el dorso de esta carpeta son escaneos de un naipe de palos españoles editado por
B. P. Grimaud en 1860. En Commons figura como "Jeu d'Aluette", pero trae justo las 40 cartas del
truco (sin ochos ni nueves), con el número en la esquina y los cortes en el marco.

- **Original:** Biblioteca Nacional de Francia. Ficha en Gallica:
  <https://gallica.bnf.fr/ark:/12148/btv1b10513825g>.
- **Fuente:** Wikimedia Commons, categoría
  [Modern Spanish Catalan deck - Grimaud - 1860](https://commons.wikimedia.org/wiki/Category:Modern_Spanish_Catalan_deck_-_Grimaud_-_1860).
  Cada imagen sale del archivo `File:Jeu d'Aluette - Grimaud - 1860 - <Número> of <Palo>.jpg`
  (en inglés: Ace … Seven, Jack, Knight, King; Swords, Clubs, Coins, Cups) y el dorso de
  `File:Jeu d'Aluette - Grimaud - 1860 - Back side.jpg`.
- **Licencia:** dominio público (en Commons: "Public domain"). Gallica pide una licencia para el uso
  comercial de sus escaneos; por ahora la baraja es gratis en la app. Antes de venderla en la tienda,
  consultar a la biblioteca.

## Cómo se generaron

Con `apps/web/scripts/baraja-gallica.py grimaud1860` (Python 3 + Pillow), igual que "El Cid". La
carta real es más alta que 2:3 (alto/ancho ≈ 1,60), así que se recorta parejo arriba y abajo
(margen blanco: el marco con los cortes queda entero).
