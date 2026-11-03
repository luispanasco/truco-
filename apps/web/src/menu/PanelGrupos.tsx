import { IconoGrupos } from './Iconos'

/** Los grupos (como los clanes de los juegos): por ahora, solo el lugar donde van a estar. */
export function PanelGrupos() {
  return (
    <section className="tarjeta grupos-pronto" aria-labelledby="grupos-pronto">
      <IconoGrupos clase="grupos-pronto-icono" />
      <h2 id="grupos-pronto">Próximamente</h2>
      <p>Armá tu grupo con amigos, con nombre y escudo, y compitan juntos en el ranking.</p>
    </section>
  )
}
