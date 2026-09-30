import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Dos servidores de Colyseus en paralelo se traban entre sí: un archivo por vez.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
})
