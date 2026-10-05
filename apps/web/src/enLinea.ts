import { useSyncExternalStore } from 'react'

/**
 * Si el navegador tiene conexión (navigator.onLine y los eventos online/offline). Es lo que dice
 * el sistema: "en línea" puede ser una red sin internet, pero "sin conexión" es seguro.
 */
function suscribir(avisar: () => void) {
  window.addEventListener('online', avisar)
  window.addEventListener('offline', avisar)
  return () => {
    window.removeEventListener('online', avisar)
    window.removeEventListener('offline', avisar)
  }
}

export function hayConexion(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

export function useEnLinea(): boolean {
  return useSyncExternalStore(suscribir, hayConexion, () => true)
}
