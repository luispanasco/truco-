import { TIPOGRAFIAS, normalizarTipografia, tipografiaGratis, type IdTipografia } from '@truco/shared'

/**
 * Cómo se carga cada tipografía. Las gratis (Nunito y Alfa Slab One) ya vienen con la app
 * (main.tsx). Las de la tienda se piden recién cuando hacen falta: el CSS de @fontsource es chico y
 * el archivo de la letra (woff2) lo baja el navegador recién cuando hay texto que la usa. Una vez
 * bajado, el service worker lo guarda para andar sin conexión (vite.config.ts). Solo latín.
 */
const CARGAR: Record<IdTipografia, (() => Promise<unknown>) | null> = {
  nunito: null,
  'alfa-slab': null,
  'bebas-neue': () => import('@fontsource/bebas-neue/latin-400.css'),
  'special-elite': () => import('@fontsource/special-elite/latin-400.css'),
  playfair: () => Promise.all([import('@fontsource/playfair-display/latin-400.css'), import('@fontsource/playfair-display/latin-700.css')]),
  caveat: () => Promise.all([import('@fontsource/caveat/latin-400.css'), import('@fontsource/caveat/latin-700.css')]),
  lobster: () => import('@fontsource/lobster/latin-400.css'),
  'permanent-marker': () => import('@fontsource/permanent-marker/latin-400.css'),
  pacifico: () => import('@fontsource/pacifico/latin-400.css'),
  'press-start': () => import('@fontsource/press-start-2p/latin-400.css'),
}

const cargadas = new Map<IdTipografia, Promise<void>>()

/** Trae el CSS de la tipografía (una sola vez). Si falla (sin conexión y sin guardar), queda Nunito. */
export function cargarTipografia(id: IdTipografia): Promise<void> {
  let carga = cargadas.get(id)
  if (!carga) {
    carga = Promise.resolve(CARGAR[id]?.())
      .then(() => undefined)
      .catch(() => {
        // Se puede volver a intentar más adelante (por ejemplo, cuando vuelva la conexión).
        cargadas.delete(id)
      })
    cargadas.set(id, carga)
  }
  return carga
}

/**
 * Escribe toda la app con la tipografía elegida: el atributo `data-tipografia` de <html> y las
 * variables de estilos.css (`--fuente-texto`, `--fuente-titulo` y `--escala-texto`, que agranda o
 * achica todo lo que se mide en rem). Lo que no se puede usar vuelve a Nunito (con la tienda de
 * prueba, `puedeUsar` deja las pagas). Mientras baja la letra se ve Nunito.
 */
export function aplicarTipografia(id: unknown, puedeUsar: (id: IdTipografia) => boolean = tipografiaGratis) {
  const t = TIPOGRAFIAS.find((x) => x.id === normalizarTipografia(id, puedeUsar)) ?? TIPOGRAFIAS[0]
  const raiz = document.documentElement
  raiz.dataset.tipografia = t.id
  raiz.style.setProperty('--fuente-texto', t.familia)
  raiz.style.setProperty('--fuente-titulo', 'titulos' in t ? t.titulos : t.familia)
  raiz.style.setProperty('--escala-texto', String(t.escala))
  raiz.style.setProperty('--sintesis-negrita', t.negrita ? 'auto' : 'none')
  void cargarTipografia(t.id)
}
