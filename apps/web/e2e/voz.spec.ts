import { crearSala, empezar, expect, persona, test, unirse } from './ayudantes'

/**
 * Chat de voz de punta a punta: dos Chromium con micrófono de mentira (un pitido cada tanto)
 * y el permiso dado solo. Se conectan directo (en la misma compu, sin STUN de por medio) y a
 * cada uno le llega el audio del otro: el anillo del otro se prende con el pitido.
 */
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] } })

test('dos personas activan la voz, se conectan y se escuchan', async ({ browser }) => {
  const ana = await persona(browser, 'Ana')
  const beto = await persona(browser, 'Beto')
  // La voz viene prendida en las salas privadas.
  const codigo = await crearSala(ana)
  await unirse(beto, codigo)
  await empezar(ana, [ana, beto])

  for (const p of [ana, beto]) {
    await p.getByRole('button', { name: 'Activar la voz' }).click()
    await expect(p.getByRole('button', { name: 'Chat de voz: micrófono abierto' })).toBeVisible()
  }
  for (const [p, otro] of [
    [ana, 'Beto'],
    [beto, 'Ana'],
  ] as const) {
    await p.getByRole('button', { name: 'Chat de voz: micrófono abierto' }).click()
    const panel = p.getByRole('dialog', { name: 'Chat de voz' })
    // "se escucha": la conexión está hecha y llegó la pista de audio del otro.
    await expect(panel.getByRole('listitem').filter({ hasText: otro })).toContainText('se escucha', { timeout: 30_000 })
    await panel.getByRole('button', { name: 'Cerrar', exact: true }).click()
    // El nivel del audio que llega prende el anillo sobre el avatar del otro.
    await p.waitForFunction(() => document.querySelector('.asiento .anillo-voz.hablando') !== null, undefined, { polling: 'raf', timeout: 15_000 })
  }

  // Beto cierra el micrófono: a Ana deja de llegarle el pitido.
  await beto.getByRole('button', { name: 'Chat de voz: micrófono abierto' }).click()
  await beto.getByRole('button', { name: 'Cerrar el micrófono' }).click()
  await expect(beto.getByRole('button', { name: 'Chat de voz: micrófono cerrado' })).toBeVisible()
  await beto.getByRole('dialog', { name: 'Chat de voz' }).getByRole('button', { name: 'Cerrar', exact: true }).click()
  await ana.waitForTimeout(1500)
  const prendido = await ana.evaluate(
    () =>
      new Promise<boolean>((listo) => {
        let visto = false
        const fin = performance.now() + 2500
        const mirar = () => {
          visto ||= document.querySelector('.asiento .anillo-voz.hablando') !== null
          if (performance.now() < fin) requestAnimationFrame(mirar)
          else listo(visto)
        }
        mirar()
      }),
  )
  expect(prendido).toBe(false)

  // Ana sale de la voz: a Beto se le va de la lista.
  await ana.getByRole('button', { name: 'Chat de voz: micrófono abierto' }).click()
  await ana.getByRole('button', { name: 'Salir de la voz' }).click()
  await beto.getByRole('button', { name: 'Chat de voz: micrófono cerrado' }).click()
  await expect(beto.getByRole('dialog', { name: 'Chat de voz' }).getByText('Todavía no hay nadie más en la voz.')).toBeVisible({ timeout: 10_000 })
})
