import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Baraja } from './pantallas/Baraja'
import { Inicio } from './pantallas/Inicio'
import { Mesa } from './pantallas/Mesa'
import './estilos.css'

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/mesa" element={<Mesa />} />
        <Route path="/baraja" element={<Baraja />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
