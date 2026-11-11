import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { calcularEnvido, calcularFlor, crearConfig, mismaCarta, piezaDe, tieneFlor, type Carta } from '@truco/engine'
import { LeccionTutorial } from '../src/pantallas/Aprender'
import { Cargar, TieneFlor } from '../src/tutorial/EjerciciosTanto'
import { pasosDe } from '../src/tutorial/lecciones'
import {
  envidoDe,
  explicarEnvido,
  explicarFlor,
  explicarTieneFlor,
  florDe,
  manoEnvido,
  manoFlor,
  manoTieneFlor,
  muestraNeutra,
  REGLA_FLOR,
  type ManoTanto,
} from '../src/tutorial/manosTanto'
import { recargarTutorial, useTutorial } from '../src/tutorial/progreso'

const c = (numero: Carta['numero'], palo: Carta['palo']): Carta => ({ numero, palo })

/** Un azar con semilla, para que las rondas se repitan. */
function conSemilla(semilla: number) {
  let s = semilla
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31
    return s / 2 ** 31
  }
}

beforeEach(() => {
  localStorage.clear()
  recargarTutorial()
})
afterEach(cleanup)

const distintas = (m: ManoTanto) =>
  m.mano.length === 3 && new Set(m.mano.map((x) => `${x.numero}${x.palo}`)).size === 3 && (!m.muestra || !m.mano.some((x) => mismaCarta(x, m.muestra!)))
const piezas = (m: ManoTanto) => (m.muestra ? m.mano.filter((x) => piezaDe(x, m.muestra!) !== null).length : 0)

describe('las manos del envido y la flor', () => {
  it('son válidas y la cuenta explicada da lo mismo que el motor', () => {
    const azar = conSemilla(11)
    for (let i = 0; i < 300; i++) {
      const sin = manoEnvido(azar, false)
      expect(distintas(sin) && sin.muestra === null && !tieneFlor(sin.mano, muestraNeutra(sin.mano))).toBe(true)
      expect(explicarEnvido(sin).total).toBe(calcularEnvido(sin.mano, muestraNeutra(sin.mano)))
      expect(explicarEnvido(sin).texto).toContain(String(envidoDe(sin)))

      const con = manoEnvido(azar, true)
      expect(distintas(con) && con.muestra !== null && !tieneFlor(con.mano, con.muestra!) && piezas(con) <= 1).toBe(true)
      expect(explicarEnvido(con).total).toBe(calcularEnvido(con.mano, con.muestra!))

      const f = manoFlor(azar, false)
      expect(distintas(f) && new Set(f.mano.map((x) => x.palo)).size).toBe(1)
      expect(explicarFlor(f).total).toBe(20 + f.mano.reduce((s, x) => s + (x.numero <= 7 ? x.numero : 0), 0))

      const fp = manoFlor(azar, true)
      expect(distintas(fp) && piezas(fp) >= 1 && tieneFlor(fp.mano, fp.muestra!)).toBe(true)
      for (const regla of ['piezaMayorMasDigitos', 'piezaMayorMasNumero'] as const) {
        const { texto, total } = explicarFlor(fp, regla)
        expect(total).toBe(calcularFlor(fp.mano, fp.muestra!, regla))
        // La suma escrita da el total.
        const [, suma] = texto.match(/([\d +]+) = \d+\.$/)!
        expect(suma!.split('+').reduce((s, x) => s + Number(x), 0)).toBe(total)
      }

      const t = manoTieneFlor(azar)
      expect(distintas(t)).toBe(true)
      expect(explicarTieneFlor(t).startsWith(tieneFlor(t.mano, t.muestra ?? muestraNeutra(t.mano)) ? 'Tiene' : 'No tiene')).toBe(true)
    }
    expect(REGLA_FLOR).toBe(crearConfig().florConPiezas)
  })

  it('las cuentas de las reglas uruguayas', () => {
    const neutra = (mano: Carta[]): ManoTanto => ({ mano, muestra: null })
    expect(envidoDe(neutra([c(6, 'oro'), c(5, 'oro'), c(1, 'copa')]))).toBe(31)
    expect(envidoDe(neutra([c(7, 'espada'), c(12, 'espada'), c(3, 'basto')]))).toBe(27)
    expect(envidoDe(neutra([c(7, 'copa'), c(4, 'basto'), c(11, 'oro')]))).toBe(7)
    expect(explicarEnvido(neutra([c(12, 'copa'), c(11, 'basto'), c(10, 'oro')])).texto).toContain('las tres son negras')
    expect(envidoDe({ mano: [c(4, 'oro'), c(7, 'copa'), c(3, 'espada')], muestra: c(6, 'oro') })).toBe(36)
    const conDoce = explicarEnvido({ mano: [c(12, 'copa'), c(5, 'basto'), c(1, 'espada')], muestra: c(2, 'copa') })
    expect(conDoce).toEqual({ total: 35, texto: expect.stringContaining('hace de 2') })
    expect(florDe({ mano: [c(2, 'oro'), c(4, 'oro'), c(7, 'basto')], muestra: c(6, 'oro') }, 'piezaMayorMasDigitos')).toBe(46)
    expect(explicarFlor({ mano: [c(2, 'oro'), c(4, 'oro'), c(7, 'basto')], muestra: c(6, 'oro') }).texto).toContain('va solo el 9')
    expect(explicarTieneFlor({ mano: [c(4, 'oro'), c(3, 'espada'), c(6, 'copa')], muestra: c(6, 'oro') })).toContain('No tiene')
  })

  it('los ejemplos de la pizarra dan lo mismo que el motor', () => {
    for (const id of ['envido', 'flor'] as const) {
      for (const p of pasosDe(id)!) {
        const n = p.tipo === 'dice' ? p.pizarra?.leyenda?.match(/= (\d+)$/) : null
        if (p.tipo !== 'dice' || !n || !p.pizarra?.cartas) continue
        const mano = p.pizarra.cartas
        const muestra = p.pizarra.muestra ?? muestraNeutra(mano)
        const valor = id === 'envido' ? calcularEnvido(mano, muestra) : calcularFlor(mano, muestra, REGLA_FLOR)
        expect(valor).toBe(Number(n[1]))
      }
    }
  })
})

/** Carga un número con el teclado. */
function cargar(n: number) {
  for (const d of String(n)) fireEvent.click(screen.getByRole('button', { name: d }))
  fireEvent.click(screen.getByRole('button', { name: 'Cargar' }))
}

describe('Cargar', () => {
  it('acepta el número del motor y marca error con otro, explicando la cuenta', () => {
    const dichos: string[] = []
    let errores: number | null = null
    // Las mismas manos que va a armar el ejercicio.
    const previa = conSemilla(5)
    const manos = [manoEnvido(previa, true), manoEnvido(previa, true)]
    render(<Cargar que="envido" rondas={2} conMuestra azar={conSemilla(5)} alDecir={(t) => dichos.push(t)} alListo={(e) => (errores = e)} />)
    expect(screen.getByText('1 de 2')).toBeTruthy()
    // El borrar saca el último número.
    fireEvent.click(screen.getByRole('button', { name: '9' }))
    fireEvent.click(screen.getByRole('button', { name: 'Borrar' }))
    expect(screen.getByLabelText('Tu envido').textContent).toBe('–')
    const bien = calcularEnvido(manos[0]!.mano, manos[0]!.muestra!)
    cargar(bien)
    expect(dichos.at(-1)).toContain('¡Eso!')
    expect((screen.getByRole('button', { name: 'Cargar' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Otra' }))
    const mal = calcularEnvido(manos[1]!.mano, manos[1]!.muestra!) + 1
    cargar(mal)
    expect(dichos.at(-1)).toContain(`No, no son ${mal}`)
    expect(dichos.at(-1)).toContain(explicarEnvido(manos[1]!).texto)
    expect(screen.getByLabelText('Tu envido').textContent).toContain(`era ${mal - 1}`)
    expect(errores).toBe(1)
    expect(screen.queryByRole('button', { name: 'Otra' })).toBeNull()
  })

  it('la flor y "¿tiene flor?"', () => {
    let errores: number | null = null
    const m = manoFlor(conSemilla(3), true)
    render(<Cargar que="flor" rondas={1} conMuestra azar={conSemilla(3)} alDecir={() => {}} alListo={(e) => (errores = e)} />)
    cargar(calcularFlor(m.mano, m.muestra!, REGLA_FLOR)!)
    expect(errores).toBe(0)
    cleanup()
    const t = manoTieneFlor(conSemilla(4))
    const dichos: string[] = []
    render(<TieneFlor rondas={1} azar={conSemilla(4)} alDecir={(x) => dichos.push(x)} alListo={(e) => (errores = e)} />)
    const tiene = tieneFlor(t.mano, t.muestra ?? muestraNeutra(t.mano))
    fireEvent.click(screen.getByRole('button', { name: tiene ? 'No tiene' : 'Tiene flor' }))
    expect(errores).toBe(1)
    expect(dichos[0]).toContain('No…')
  })
})

function abrir(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/aprender/:leccion" element={<LeccionTutorial />} />
      </Routes>
    </MemoryRouter>,
  )
}

const seguir = () => fireEvent.click(screen.getByRole('button', { name: /^(Seguir|Terminar)$/ }))

/** Juega las rondas de cargar o de "¿tiene flor?" respondiendo siempre lo mismo (algunas mal). */
function jugarRondas(boton: () => void) {
  for (;;) {
    boton()
    const otra = screen.queryByRole('button', { name: 'Otra' })
    if (!otra) return
    fireEvent.click(otra)
  }
}

describe('las lecciones del tanto', () => {
  // Son largas (muchas rondas renderizadas): más tiempo que el de siempre.
  it.each(['envido', 'flor'] as const)('la de %s se puede hacer entera', (id) => {
    for (const antes of ['historia', 'baraja', 'jerarquia', 'piezas', 'vueltas', 'envido'] as const) if (antes !== id) useTutorial.getState().terminar(antes, 3)
    abrir(`/aprender/${id}`)
    for (const p of pasosDe(id)!) {
      if (p.tipo === 'cargar') jugarRondas(() => cargar(20))
      if (p.tipo === 'tieneFlor') jugarRondas(() => fireEvent.click(screen.getByRole('button', { name: 'Tiene flor' })))
      seguir()
    }
    expect(screen.getByRole('region', { name: 'Lección terminada' })).toBeTruthy()
    expect(useTutorial.getState().progreso[id]).toBeDefined()
  }, 20000)
})
