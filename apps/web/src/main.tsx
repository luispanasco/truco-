import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { MotionConfig } from 'motion/react'
// Fuentes guardadas en la app (no de Google Fonts), así andan sin internet. Solo latín y los pesos que se usan.
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'
import '@fontsource/alfa-slab-one/latin-400.css'
import { AvisoActualizacion } from './componentes/Pwa'
import { Baraja } from './pantallas/Baraja'
import { Buscar } from './pantallas/Buscar'
import { Compartido } from './pantallas/Compartido'
import { Crear } from './pantallas/Crear'
import { Inicio } from './pantallas/Inicio'
import { Mesa } from './pantallas/Mesa'
import { PruebaOjeo } from './pantallas/PruebaOjeo'
import { Sala } from './pantallas/Sala'
import { Unirme } from './pantallas/Unirme'
import { escucharInstalacion } from './pwa'
import { prepararSonido } from './sonido'
import './estilos.css'
import './estilos-online.css'

escucharInstalacion()
prepararSonido()
// El service worker existe solo en la versión compilada (en desarrollo molestaría con la caché).
if (import.meta.env.PROD) void import('./registrarSW').then((m) => m.registrarSW())

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    {/* Con "reducir movimiento" en el sistema, motion deja solo los fundidos (sin deslizar ni escalar). */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AvisoActualizacion />
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/mesa" element={<Mesa />} />
          <Route path="/baraja" element={<Baraja />} />
          <Route path="/ojeo" element={<PruebaOjeo />} />
          {/* Online */}
          <Route path="/crear" element={<Crear />} />
          <Route path="/unirme" element={<Unirme />} />
          <Route path="/s/:codigo" element={<Compartido />} />
          <Route path="/sala" element={<Sala />} />
          <Route path="/buscar" element={<Buscar />} />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
)
