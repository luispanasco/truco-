import { join } from 'node:path'
import type { Page } from '@playwright/test'
import { expect, persona, test } from './ayudantes'

/** Entra con el login de prueba desde el banner. */
async function entrarConCuenta(page: Page, nombre: string) {
  await page.locator('.banner-entrar').click()
  const hoja = page.getByRole('dialog', { name: 'Entrar a tu cuenta' })
  await hoja.getByPlaceholder('vos@ejemplo.com').fill(`${nombre}-${Date.now()}@ejemplo.com`)
  await hoja.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(hoja).toBeHidden()
}

/**
 * Los grupos de punta a punta: Ana crea uno cerrado con foto (la app la achica antes de subirla),
 * Beto no lo ve en la lista pero entra con el código, y Ana lo hace capitán.
 */
test('crear un grupo con foto y sumar a alguien con el código', async ({ browser }) => {
  const ana = await persona(browser, 'Ana')
  await entrarConCuenta(ana, 'ana')
  await ana.getByRole('tab', { name: 'Grupos' }).click()
  const panel = ana.locator('#panel-grupos')
  await expect(panel.getByText('Todavía no estás en ningún grupo.')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Crear grupo' })).toBeInViewport({ ratio: 1 })
  await expect(panel).not.toHaveAttribute('inert')
  await panel.getByRole('button', { name: 'Crear grupo' }).click()

  const crear = ana.getByRole('dialog', { name: 'Crear grupo' })
  await crear.getByLabel('Foto del grupo').setInputFiles(join(import.meta.dirname, '..', 'public', 'iconos', 'icono-512.png'))
  await expect(crear.locator('.escudo-grupo img')).toBeVisible()
  await crear.getByPlaceholder('Los del boliche').fill(`Los Pibes ${Date.now() % 10000}`)
  await crear.getByPlaceholder('BOL', { exact: true }).fill('pib')
  await crear.getByRole('radio', { name: 'Cerrado' }).click()
  await crear.getByRole('button', { name: 'Crear grupo' }).click()

  // La pantalla del grupo: la foto subida, Ana de líder y el código.
  await expect(ana).toHaveURL(/\/grupos\/[0-9a-f-]{36}$/)
  await expect(ana.getByText(/Sos líder/)).toBeVisible()
  const foto = ana.locator('.grupo-cabecera .escudo-grupo img')
  await expect(foto).toHaveAttribute('src', /\/grupos\/[0-9a-f-]+\/foto\?v=1$/)
  await expect.poll(() => foto.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(256)
  const codigo = (await ana.locator('.codigo-amigo strong').innerText()).trim()
  expect(codigo).toMatch(/^[A-Z0-9]{7}$/)

  // Beto: cerrado no aparece para buscar, pero con el código entra.
  const beto = await persona(browser, 'Beto')
  await entrarConCuenta(beto, 'beto')
  await beto.getByRole('tab', { name: 'Grupos' }).click()
  const panelBeto = beto.locator('#panel-grupos')
  await expect(panelBeto.getByText('Todavía no estás en ningún grupo.')).toBeVisible()
  await expect(panelBeto.getByRole('heading', { name: 'Buscar grupos' })).toBeHidden()
  // Que termine de deslizar hasta la pantalla (mientras pasa por las otras, está inerte).
  await expect(panelBeto.getByPlaceholder('ABC2345')).toBeInViewport({ ratio: 1 })
  await expect(panelBeto).not.toHaveAttribute('inert')
  await panelBeto.getByPlaceholder('ABC2345').fill(codigo)
  await panelBeto.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(beto).toHaveURL(/\/grupos\//)
  await expect(beto.getByText(/Sos miembro/)).toBeVisible()
  await expect(beto.getByText('Código de invitación')).toBeHidden()

  // Ana lo ve (al recargar) y lo hace capitán.
  await ana.reload()
  await ana.getByRole('button', { name: 'Opciones de Beto' }).click()
  await ana.getByRole('button', { name: 'Hacer capitán' }).click()
  await expect(ana.locator('.miembro-grupo', { hasText: 'Beto' }).getByText('Capitán')).toBeVisible()
  await beto.reload()
  await expect(beto.getByText(/Sos capitán/)).toBeVisible()
  await expect(beto.getByText('Código de invitación')).toBeVisible()
})
