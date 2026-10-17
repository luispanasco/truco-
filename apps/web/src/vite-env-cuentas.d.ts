/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Fase 2: el proyecto de Supabase (ver INSTRUCTIVO-CUENTAS.md). Sin esto, no hay login con Google ni por email. */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}
