import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ConexionLocal } from '../src/conexion/local'
import { useJuego } from '../src/estado'
import { Inicio } from '../src/pantallas/Inicio'
import { Mesa } from '../src/pantallas/Mesa'

function App({ ruta }: { ruta: string }) {
  return (
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/mesa" element={<Mesa />} />
      </Routes>
    </MemoryRouter>
  )
}

afterEach(() => {
  act(() => useJuego.getState().salir())
  cleanup()
})

describe('interfaz', () => {
  it('desde el inicio, con apodo, se entra a la mesa contra bots', async () => {
    render(<App ruta="/" />)
    const jugar = screen.getByRole('button', { name: 'Jugar contra bots' })
    expect(jugar).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByPlaceholderText('¿Cómo te dicen?'), { target: { value: 'Luis' } })
    fireEvent.click(screen.getByRole('button', { name: 'Jugar contra bots' }))
    await waitFor(() => expect(screen.getByText('muestra')).toBeTruthy())
    expect(screen.getAllByLabelText(/^Jugar el /)).toHaveLength(3)
  })

  it('en la mesa se juega tocando la carta y con los botones de canto', async () => {
    act(() =>
      useJuego
        .getState()
        .conectar(new ConexionLocal({ apodo: 'Luis', avatar: '🧉', formato: '1v1', nivelBots: 'facil', demoraBots: [0, 0], semilla: 21 })),
    )
    render(<App ruta="/mesa" />)
    // Espera a que le toque a la persona.
    await waitFor(() => expect(screen.getByText('Te toca')).toBeTruthy(), { timeout: 5000 })

    // Los cantos disponibles aparecen como botones; el truco está entre ellos al empezar.
    const vista = useJuego.getState().vista!
    if (vista.accionesValidas.some((a) => a.tipo === 'cantarTruco')) {
      expect(screen.getByRole('button', { name: 'Truco' })).toBeTruthy()
    }

    // Tocar una carta jugable la tira a la mesa.
    const jugables = screen.getAllByLabelText(/^Jugar el /).filter((b) => !(b as HTMLButtonElement).disabled)
    if (jugables.length > 0) {
      fireEvent.click(jugables[0]!)
      await waitFor(() => expect(useJuego.getState().vista!.mano.misCartas).toHaveLength(2), { timeout: 5000 })
    }
  })
})
