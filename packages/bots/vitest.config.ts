import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Algunas pruebas juegan muchas partidas enteras (con el pie mandando): con todo corriendo a la vez, tardan.
    testTimeout: 30_000,
  },
})
