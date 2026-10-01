import { useState } from 'react'
import type { Carta as TCarta } from '@truco/engine'
import { Carta } from '../componentes/Carta'
import { ManoOjeable } from '../componentes/ManoOjeable'
import { guardarPerfil, leerPerfil } from '../perfil'
import { elegirBaraja, useBaraja } from '../baraja'

/** Manos de ejemplo, de adelante hacia atrás: una de cada palo y una mezclada. */
const MANOS: { nombre: string; cartas: TCarta[] }[] = [
  { nombre: 'Oros', cartas: [{ numero: 7, palo: 'oro' }, { numero: 1, palo: 'oro' }, { numero: 12, palo: 'oro' }] },
  { nombre: 'Copas', cartas: [{ numero: 3, palo: 'copa' }, { numero: 10, palo: 'copa' }, { numero: 5, palo: 'copa' }] },
  { nombre: 'Espadas', cartas: [{ numero: 1, palo: 'espada' }, { numero: 4, palo: 'espada' }, { numero: 11, palo: 'espada' }] },
  { nombre: 'Bastos', cartas: [{ numero: 6, palo: 'basto' }, { numero: 2, palo: 'basto' }, { numero: 7, palo: 'basto' }] },
  { nombre: 'Mezcla', cartas: [{ numero: 2, palo: 'copa' }, { numero: 7, palo: 'espada' }, { numero: 1, palo: 'basto' }] },
]
const MUESTRA: TCarta = { numero: 4, palo: 'oro' }

/** Página de desarrollo (/ojeo): para probar el ojeo con manos de los cuatro palos. */
export function PruebaOjeo() {
  const [cual, setCual] = useState(0)
  const [vuelta, setVuelta] = useState(0)
  const [ojear, setOjear] = useState(() => leerPerfil().ojear)
  const [turno, setTurno] = useState(false)
  const [registro, setRegistro] = useState('')
  const baraja = useBaraja((e) => e.baraja)
  const mano = MANOS[cual]!

  const repartir = (i: number) => {
    setCual(i)
    setVuelta((v) => v + 1)
    setRegistro('')
  }
  // El interruptor queda guardado en el perfil, igual que el ajuste de la pantalla de inicio.
  const cambiarOjeo = (v: boolean) => {
    setOjear(v)
    guardarPerfil({ ...leerPerfil(), ojear: v })
    setVuelta((x) => x + 1)
  }

  return (
    <div className="pantalla-ojeo">
      <h1>Ojeo de cartas</h1>
      <div className="ojeo-manos" role="group" aria-label="Manos de ejemplo">
        {MANOS.map((m, i) => (
          <button key={m.nombre} type="button" className="boton" aria-pressed={i === cual} onClick={() => repartir(i)}>
            {m.nombre}
          </button>
        ))}
      </div>
      <div className="ojeo-opciones">
        <label>
          <input type="checkbox" checked={ojear} onChange={(e) => cambiarOjeo(e.target.checked)} />
          Ojear cartas
        </label>
        <label>
          <input type="checkbox" checked={turno} onChange={(e) => setTurno(e.target.checked)} />
          Es mi turno
        </label>
        <label>
          {/* Las zonas del ojeo cambian con la baraja (ojeo.ts): se reparte de nuevo. */}
          <input
            type="checkbox"
            checked={baraja === 'fournier1878'}
            onChange={(e) => {
              elegirBaraja(e.target.checked ? 'fournier1878' : 'propia')
              setVuelta((x) => x + 1)
            }}
          />
          Baraja clásica
        </label>
      </div>
      <div className="ojeo-escenario">
        {/* La muestra no se ojea: se ve como siempre. */}
        <div className="ojeo-muestra">
          <Carta carta={MUESTRA} tam="mesa" />
          <span>Muestra</span>
        </div>
        <ManoOjeable
          key={vuelta}
          cartas={mano.cartas}
          ojeoActivado={ojear}
          abrirAlTocar={turno}
          reparto
          jugable={() => turno}
          alTocar={(c) => setRegistro(`Jugarías el ${c.numero} de ${c.palo}`)}
          onAbrir={() => setRegistro('Mano abierta')}
        />
        <p className="ojeo-registro" role="status">
          {registro}
        </p>
      </div>
      <button type="button" className="boton boton-secundario" onClick={() => repartir(cual)}>
        Repartir de nuevo
      </button>
    </div>
  )
}
