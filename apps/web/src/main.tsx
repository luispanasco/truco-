import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { MotionConfig } from 'motion/react'
import { Baraja } from './pantallas/Baraja'
import { Buscar } from './pantallas/Buscar'
import { Compartido } from './pantallas/Compartido'
import { Crear } from './pantallas/Crear'
import { Inicio } from './pantallas/Inicio'
import { Mesa } from './pantallas/Mesa'
import { PruebaOjeo } from './pantallas/PruebaOjeo'
import { Sala } from './pantallas/Sala'
import { Unirme } from './pantallas/Unirme'
import './estilos.css'
import './estilos-online.css'

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    {/* Con "reducir movimiento" en el sistema, motion deja solo los fundidos (sin deslizar ni escalar). */}
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
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
