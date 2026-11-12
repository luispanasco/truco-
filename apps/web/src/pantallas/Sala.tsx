import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { buscarDepartamento, buscarMesa, elencoDelNivel, nivelDeHistoria, type InfoSala, type LugarPublico } from '@truco/shared'
import { BARAJAS } from '../baraja'
import { FormularioSala, opcionesDeSala, opcionesParaServidor, resumenSala, type OpcionesSala } from '../componentes/FormularioSala'
import { avatarDeLugar } from '../componentes/Asiento'
import { Avatar } from '../componentes/Avatar'
import { AvisoConexion, CabeceraOnline, ErrorServidor, useIrALaMesa, useSalirAlDesmontar } from '../componentes/Online'
import { SelectorBaraja } from '../componentes/SelectorBaraja'
import { SelectorMesa } from '../componentes/SelectorMesa'
import { usePerfil } from '../componentes/TarjetaPerfil'
import { useJuego } from '../estado'
import { InvitarAmigos, InvitarGrupos } from '../componentes/Amistad'
import '../estilos-avatar.css'

const linkDe = (codigo: string) => `${location.origin}/s/${codigo}`

/** Código grande y las formas de pasárselo a los demás. */
function Invitar({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState<boolean | null>(null)
  const link = linkDe(codigo)
  const puedeCompartir = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (copiado === null) return
    const t = setTimeout(() => setCopiado(null), 2200)
    return () => clearTimeout(t)
  }, [copiado])

  const compartir = () => {
    navigator
      .share({ title: 'Truco uruguayo', text: `¿Jugamos un truco? Entrá a la sala ${codigo}`, url: link })
      // Si la persona cierra el menú de compartir no pasa nada.
      .catch(() => {})
  }
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <section className="tarjeta invitacion">
      <span className="invitacion-texto">Código de la sala</span>
      <strong className="codigo-sala" aria-label={`Código ${codigo.split('').join(' ')}`}>
        {codigo}
      </strong>
      <div className={puedeCompartir ? 'botones-fila' : ''}>
        {puedeCompartir && (
          <button type="button" className="boton" onClick={compartir}>
            Compartir
          </button>
        )}
        <button type="button" className={`boton ${puedeCompartir ? 'boton-secundario' : ''}`} onClick={copiar}>
          Copiar link
        </button>
      </div>
      {copiado === true && (
        <p className="copiado" role="status">
          ¡Copiado!
        </p>
      )}
      {/* Sin portapapeles (http en el celular, por ejemplo), el link queda a la vista para copiarlo a mano. */}
      {copiado === false && <p className="link-a-mano">{link}</p>}
    </section>
  )
}

function Lugar({ lugar, yo, alSentarse, rival }: { lugar: LugarPublico; yo: number | null; alSentarse: () => void; rival?: string }) {
  // En un nivel del modo historia, los lugares del otro equipo son del elenco: no se ocupan.
  if (lugar.tipo === 'libre' && rival) {
    return (
      <div className="lugar libre" aria-label={`Lugar ${lugar.asiento + 1}: ${rival}, rival del nivel`}>
        <span className="lugar-avatar" aria-hidden="true">
          ⚔
        </span>
        <span className="lugar-texto">
          <strong>{rival}</strong>
          <small>Rival del nivel</small>
        </span>
      </div>
    )
  }
  if (lugar.tipo === 'libre') {
    return (
      <button
        type="button"
        className="lugar libre"
        onClick={alSentarse}
        disabled={yo === null}
        aria-label={`Lugar libre ${lugar.asiento + 1}: sentarme acá`}
      >
        <span className="lugar-avatar">+</span>
        <span className="lugar-texto">
          <strong>Libre</strong>
          <small>Sentate acá</small>
        </span>
      </button>
    )
  }
  const esYo = lugar.asiento === yo
  const estado = lugar.tipo === 'bot' ? 'Bot' : lugar.conectado ? 'Conectado' : 'Desconectado'
  return (
    <div className={`lugar ${lugar.tipo}${esYo ? ' yo' : ''}${lugar.tipo === 'humano' && !lugar.conectado ? ' desconectado' : ''}`}>
      <span className="lugar-avatar">
        <Avatar codigo={avatarDeLugar(lugar)} apodo={lugar.apodo} encuadre="cara" />
      </span>
      <span className="lugar-texto">
        <strong>
          {lugar.apodo}
          {esYo && <span className="lugar-vos"> (vos)</span>}
        </strong>
        <small>
          <span className={`lugar-punto ${lugar.conectado ? 'en-linea' : ''}`} aria-hidden="true" />
          {estado}
        </small>
      </span>
      {lugar.anfitrion && (
        <span className="lugar-anfitrion" title="Anfitrión" aria-label="Anfitrión">
          ★
        </span>
      )}
    </div>
  )
}

function Lugares({ sala }: { sala: InfoSala }) {
  const enviar = useJuego((s) => s.enviar)
  const ocupados = sala.lugares.filter((l) => l.tipo !== 'libre').length
  const equipos = [0, 1].map((e) => sala.lugares.filter((l) => l.asiento % 2 === e))
  const nivel = sala.historia && nivelDeHistoria(sala.historia.departamento, sala.historia.nivel, sala.historia.barrio ?? '')
  const elenco = nivel ? elencoDelNivel(nivel) : null
  const rival = (asiento: number) => (elenco && asiento % 2 === 1 ? elenco[asiento - 1]?.nombre : undefined)
  return (
    <section className="tarjeta">
      <h2>
        En la mesa{' '}
        <span className="insignia">
          {ocupados} de {sala.lugares.length}
        </span>
      </h2>
      <div className="equipos">
        {equipos.map((lugares, e) => (
          <div key={e} className="equipo" role="group" aria-label={`Equipo ${e + 1}`}>
            <h3>
              Equipo {e + 1}
              {sala.yo !== null && sala.yo % 2 === e && <span className="equipo-tuyo">tu equipo</span>}
            </h3>
            {lugares.map((l) => (
              <Lugar
                key={l.asiento}
                lugar={l}
                yo={sala.yo}
                rival={rival(l.asiento)}
                alSentarse={() => enviar('elegirAsiento', { asiento: l.asiento })}
              />
            ))}
          </div>
        ))}
      </div>
      {ocupados < sala.lugares.length && (
        <p className="nota-izq">
          {elenco
            ? 'Si no viene nadie a tu equipo, juegan los compañeros del nivel.'
            : sala.botsEnVacios
              ? 'Si al empezar quedan lugares libres, los ocupan bots.'
              : 'Hace falta la mesa completa para empezar.'}
          {sala.lugares.length > 2 && !elenco && ' Tocá un lugar libre para cambiarte de equipo.'}
        </p>
      )}
    </section>
  )
}

/** Un nivel del modo historia en cooperativo: dónde, contra quién y cómo, y que el amigo va de tu lado. */
function NivelDeLaSala({ sala }: { sala: InfoSala }) {
  const nivel = nivelDeHistoria(sala.historia!.departamento, sala.historia!.nivel, sala.historia!.barrio ?? '')
  const departamento = buscarDepartamento(sala.historia!.departamento)
  if (!nivel || !departamento) return null
  const rivales = elencoDelNivel(nivel)
    .filter((_, i) => i % 2 === 0)
    .map((p) => p.nombre)
  return (
    <section className="tarjeta" aria-labelledby="sala-nivel">
      <h2 id="sala-nivel">
        {departamento.nombre} · Nivel {sala.historia!.nivel}
      </h2>
      <p className="nota-izq">
        {nivel.lugar}: {rivales.slice(0, -1).join(', ')}
        {rivales.length > 1 ? ' y ' : ''}
        {rivales.at(-1)} contra ustedes, a {nivel.puntos} puntos. Pasale el código a un amigo: juega de tu lado y, si ganan, a los dos se les anota
        el nivel.
      </p>
    </section>
  )
}

function Configuracion({ sala, esAnfitrion }: { sala: InfoSala; esAnfitrion: boolean }) {
  const enviar = useJuego((s) => s.enviar)
  const [editando, setEditando] = useState<OpcionesSala | null>(null)
  if (editando) {
    return (
      <section className="tarjeta">
        <h2>Cambiar la sala</h2>
        <FormularioSala valor={editando} alCambiar={setEditando} />
        <div className="botones-fila">
          <button type="button" className="boton boton-secundario" onClick={() => setEditando(null)}>
            Cancelar
          </button>
          <button
            type="button"
            className="boton"
            onClick={() => {
              enviar('configurar', opcionesParaServidor(editando))
              setEditando(null)
            }}
          >
            Guardar
          </button>
        </div>
      </section>
    )
  }
  return (
    <section className="tarjeta">
      <h2>
        Cómo se juega
        {esAnfitrion && (
          <button type="button" className="boton-texto" onClick={() => setEditando(opcionesDeSala(sala))}>
            Cambiar
          </button>
        )}
      </h2>
      <ul className="resumen-sala">
        {resumenSala(opcionesDeSala(sala)).map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  )
}

/** "Mesa Bordó · Baraja clásica, de Ana": con qué se ve la partida (lo pone el anfitrión). */
export function textoMesaYBaraja(sala: Pick<InfoSala, 'mesa' | 'baraja' | 'lugares' | 'yo'>): string {
  const mesa = buscarMesa(sala.mesa)?.nombre ?? sala.mesa
  const baraja = BARAJAS.find((b) => b.id === sala.baraja)?.corto ?? sala.baraja
  const anfitrion = sala.lugares.find((l) => l.anfitrion)
  const de = !anfitrion ? '' : anfitrion.asiento === sala.yo ? ', las tuyas' : `, de ${anfitrion.apodo}`
  return `Mesa ${mesa} · Baraja ${baraja}${de}`
}

/**
 * La mesa y la baraja de la sala, en una línea. El anfitrión las puede cambiar acá mismo: quedan
 * en su perfil y el servidor se las pasa a todos.
 */
function MesaYBaraja({ sala, esAnfitrion }: { sala: InfoSala; esAnfitrion: boolean }) {
  const enviar = useJuego((s) => s.enviar)
  const [perfil, cambiar] = usePerfil()
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <p className="linea-mesa-sala">
        <span className="muestra-mesa-sala" aria-hidden="true" />
        <span>{textoMesaYBaraja(sala)}</span>
        {esAnfitrion && !abierto && (
          <button type="button" className="boton-texto" aria-label="Cambiar la mesa y la baraja" onClick={() => setAbierto(true)}>
            Cambiar
          </button>
        )}
      </p>
      {esAnfitrion && abierto && (
        <section className="tarjeta">
          <h2>Mesa y baraja</h2>
          <SelectorMesa
            valor={sala.mesa}
            tiendaDesbloqueada={perfil.tiendaDesbloqueada}
            alCambiar={(mesa) => {
              cambiar({ mesa })
              enviar('mesaYBaraja', { mesa, baraja: sala.baraja })
            }}
          />
          <SelectorBaraja
            baraja={sala.baraja}
            alElegir={(baraja) => {
              cambiar({ baraja })
              enviar('mesaYBaraja', { mesa: sala.mesa, baraja })
            }}
          />
          <button type="button" className="boton boton-secundario" onClick={() => setAbierto(false)}>
            Listo
          </button>
        </section>
      )}
    </>
  )
}

/** Sala de espera de una partida privada, hasta que el anfitrión la empieza. */
export function Sala() {
  const navegar = useNavigate()
  const sala = useJuego((s) => s.sala)
  const hayConexion = useJuego((s) => s.conexion !== null)
  const enviar = useJuego((s) => s.enviar)
  useIrALaMesa()
  useSalirAlDesmontar()
  useEffect(() => {
    // Recargar la página pierde la conexión: desde el inicio se puede volver a la partida.
    if (!hayConexion) navegar('/', { replace: true })
  }, [hayConexion, navegar])

  const salir = () => {
    useJuego.getState().salir()
    navegar('/')
  }

  if (!sala) {
    return (
      <div className="pantalla-inicio pantalla-online">
        <CabeceraOnline titulo="Sala de espera" alVolver={salir} />
        <AvisoConexion />
        <p className="nota">Entrando a la sala…</p>
      </div>
    )
  }

  const esAnfitrion = sala.yo !== null && sala.lugares[sala.yo]?.anfitrion === true
  const faltan = sala.lugares.some((l) => l.tipo === 'libre')
  const puedeEmpezar = sala.botsEnVacios || !faltan

  return (
    <div className="pantalla-inicio pantalla-online">
      <CabeceraOnline titulo="Sala de espera" alVolver={salir} />
      <AvisoConexion />
      {sala.codigo && <Invitar codigo={sala.codigo} />}
      {sala.codigo && <InvitarAmigos />}
      {sala.codigo && <InvitarGrupos sala={{ codigo: sala.codigo, formato: sala.formato, puntos: sala.config.puntosPartida }} />}
      {sala.historia && <NivelDeLaSala sala={sala} />}
      <Lugares sala={sala} />
      {/* En un nivel del modo historia, la mesa y las reglas las pone el nivel. */}
      {!sala.historia && <MesaYBaraja sala={sala} esAnfitrion={esAnfitrion} />}
      {!sala.historia && <Configuracion sala={sala} esAnfitrion={esAnfitrion} />}
      <ErrorServidor />
      {esAnfitrion ? (
        <>
          <button type="button" className="boton boton-grande" disabled={!puedeEmpezar} onClick={() => enviar('iniciar', {})}>
            Empezar
          </button>
          {!puedeEmpezar && <p className="nota">Faltan jugadores. Esperá a que lleguen o activá “Completar con bots”.</p>}
        </>
      ) : (
        <p className="esperando-anfitrion" role="status">
          <span className="punto-latido" aria-hidden="true" />
          Esperando que el anfitrión empiece
        </p>
      )}
      <button type="button" className="boton boton-secundario" onClick={salir}>
        Salir de la sala
      </button>
    </div>
  )
}
