import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { mismaCarta, type Accion, type Carta as TCarta } from '@truco/engine'
import { GESTO, SIGNIFICADO, esPiezaOMata } from '../senias'
import { Acciones } from '../componentes/Acciones'
import { Asiento, Avatar } from '../componentes/Asiento'
import { Carta } from '../componentes/Carta'
import { useJuego } from '../estado'

export function Mesa() {
  const navegar = useNavigate()
  const { sala, vista, mesa, globos, registro, senias, error, turno, enviar, salir } = useJuego()
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!useJuego.getState().conexion) navegar('/')
  }, [navegar])

  // Los errores y las señas se muestran un rato y se van.
  useEffect(() => {
    if (!error) return
    setAviso(`⚠ ${error.motivo}`)
    const t = setTimeout(() => setAviso(null), 2500)
    return () => clearTimeout(t)
  }, [error])
  const ultimaSenia = senias[senias.length - 1]
  const [seniaVisible, setSeniaVisible] = useState<typeof ultimaSenia>(undefined)
  useEffect(() => {
    if (!ultimaSenia) return
    setSeniaVisible(ultimaSenia)
    const t = setTimeout(() => setSeniaVisible(undefined), 3500)
    return () => clearTimeout(t)
  }, [ultimaSenia])

  if (!sala || !vista) return <div className="cargando">Repartiendo…</div>

  const yo = vista.yo.asiento
  const n = vista.jugadores.length
  const rel = (a: number) => (a - yo + n) % n
  const e = vista.mano.enfrentamientos[vista.mano.actual]!
  const participa = (a: number) => e.participantes.includes(a)
  const meToca = vista.esperandoA.includes(yo) && vista.ganador === null
  const jugar = (a: Accion) => enviar('accion', { accion: a })
  const jugarCarta = (c: TCarta) => {
    const a = vista.accionesValidas.find((x) => x.tipo === 'jugarCarta' && mismaCarta(x.carta, c))
    if (a) jugar(a)
  }
  const puedeJugar = (c: TCarta) =>
    vista.accionesValidas.some((x) => x.tipo === 'jugarCarta' && mismaCarta(x.carta, c))
  const nuestro = yo % 2
  const [pn, pe] = [vista.puntos[nuestro as 0 | 1], vista.puntos[(1 - nuestro) as 0 | 1]]
  const enEquipos = n > 2
  const vueltas = e.vueltas.filter((v) => v.resultado !== null)
  const lugarYo = sala.lugares[yo]!
  const salirDeLaMesa = () => {
    salir()
    navegar('/')
  }

  return (
    <div className={`pantalla-mesa n-${n}`}>
      <header className="marcador">
        <div className="marcador-equipo nosotros">
          <span>{enEquipos ? 'Nosotros' : 'Vos'}</span>
          <strong>{pn}</strong>
        </div>
        <div className="marcador-centro">
          <div className="marcador-muestra">
            <Carta carta={vista.mano.muestra} tam="chica" />
            <span>muestra</span>
          </div>
          {e.truco.valor > 1 && <div className="marcador-valor">vale {e.truco.valor}</div>}
          {vista.mano.picaPica && <div className="marcador-valor">pica-pica</div>}
        </div>
        <div className="marcador-equipo ellos">
          <span>{enEquipos ? 'Ellos' : sala.lugares[1 - yo]?.apodo}</span>
          <strong>{pe}</strong>
        </div>
      </header>

      <main className="tapete">
        <div className="registro" aria-live="polite">
          {registro.slice(-3).map((l) => (
            <div key={l.id}>{l.texto}</div>
          ))}
        </div>

        {sala.lugares
          .filter((l) => l.asiento !== yo)
          .map((l) => (
            <Asiento
              key={l.asiento}
              lugar={l}
              posicion={rel(l.asiento)}
              cartasEnMano={vista.jugadores[l.asiento]!.cartasEnMano}
              esCompaniero={l.asiento % 2 === yo % 2}
              leToca={turno.asientos.includes(l.asiento) && participa(l.asiento)}
              esMano={e.mano === l.asiento}
              participa={participa(l.asiento)}
              globo={globos[l.asiento]}
            />
          ))}

        <div className="centro">
          {mesa.jugadas.map((j) => (
            <div key={`${j.asiento}-${j.carta.numero}-${j.carta.palo}`} className={`jugada pos-${rel(j.asiento)}`}>
              <Carta carta={j.carta} tam="mesa" ganadora={mesa.cerrada && mesa.ganador === j.asiento} />
            </div>
          ))}
          {vueltas.length > 0 && (
            <div className="vueltas" aria-label="Resultado de las vueltas">
              {vueltas.map((v, i) => (
                <span key={i} className={v.resultado === 'parda' ? 'parda' : v.resultado === nuestro ? 'ganada' : 'perdida'}>
                  {v.resultado === 'parda' ? '=' : v.resultado === nuestro ? '✔' : '✘'}
                </span>
              ))}
            </div>
          )}
        </div>
      </main>

      <section className={`mi-lugar${meToca ? ' le-toca' : ''}`}>
        {globos[yo] && (
          <div key={globos[yo]!.id} className="globo globo-yo">
            {globos[yo]!.texto}
          </div>
        )}
        <div className="mi-info">
          <Avatar lugar={lugarYo} tam="chico" />
          <span className="mi-nombre">
            {lugarYo.apodo}
            {e.mano === yo && <span className="marca-mano">M</span>}
          </span>
          {sala.ayudas && (
            <span className="mi-tanto">
              envido {vista.mano.miTanto.envido}
              {vista.mano.miTanto.flor !== null && <strong> · ¡flor de {vista.mano.miTanto.flor}!</strong>}
            </span>
          )}
          {meToca && <span className="te-toca">Te toca</span>}
        </div>
        <div className="mi-mano">
          {vista.mano.misCartas.map((c) => (
            <Carta
              key={`${c.numero}-${c.palo}`}
              carta={c}
              tam="grande"
              jugable={puedeJugar(c)}
              resaltada={sala.ayudas && esPiezaOMata(c, vista.mano.muestra)}
              alTocar={() => jugarCarta(c)}
            />
          ))}
        </div>
        <Acciones vista={vista} alElegir={jugar} />
      </section>

      {aviso && <div className="aviso">{aviso}</div>}
      {seniaVisible && (
        <div className="aviso aviso-senia" key={seniaVisible.id}>
          👀 {sala.lugares[seniaVisible.de]?.apodo}: {GESTO[seniaVisible.senia].toLowerCase()} ({SIGNIFICADO[seniaVisible.senia]})
        </div>
      )}

      {vista.ganador !== null && (
        <div className="fin">
          <div className="fin-caja">
            <h2>{vista.ganador === nuestro ? (enEquipos ? '¡Ganaron!' : '¡Ganaste!') : enEquipos ? 'Perdieron' : 'Perdiste'}</h2>
            <p>
              {enEquipos ? 'Nosotros' : 'Vos'} {pn} · {enEquipos ? 'Ellos' : sala.lugares[1 - yo]?.apodo} {pe}
            </p>
            <button type="button" className="boton" onClick={() => enviar('revancha', {})}>
              Revancha
            </button>
            <button type="button" className="boton boton-secundario" onClick={salirDeLaMesa}>
              Volver al inicio
            </button>
          </div>
        </div>
      )}

      <button type="button" className="boton-salir" onClick={salirDeLaMesa} aria-label="Salir de la mesa">
        ✕
      </button>
    </div>
  )
}
