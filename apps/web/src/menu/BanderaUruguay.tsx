/**
 * La bandera de Uruguay con el Sol de Mayo: el SVG oficial de Wikimedia Commons
 * ("Flag_of_Uruguay.svg", dominio público), guardado en public/ así anda sin internet.
 * Va como imagen y no como SVG dentro de la página: el archivo trae sus propias clases
 * (.C, .D…) que se mezclarían con los estilos de la app.
 */
export function BanderaUruguay({ clase = '' }: { clase?: string }) {
  return (
    <img
      className={`bandera-uruguay ${clase}`}
      src={`${import.meta.env.BASE_URL}bandera-uruguay.svg`}
      alt="Bandera de Uruguay"
      width={45}
      height={30}
      draggable={false}
    />
  )
}
