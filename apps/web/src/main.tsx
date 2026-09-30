import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { MotionConfig } from 'motion/react'
import { Baraja } from './pantallas/Baraja'
import { Inicio } from './pantallas/Inicio'
import { Mesa } from './pantallas/Mesa'
import { PruebaOjeo } from './pantallas/PruebaOjeo'
import './estilos.css'

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
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  </StrictMode>,
)
