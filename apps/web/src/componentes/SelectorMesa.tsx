import { useEffect, useRef, useState, type ReactNode } from "react";
import { MESAS, idMesa, type IdMesa } from "@truco/shared";
import { useEsBeta, useInventario } from "../cuenta/inventario";
import { Carta } from "./Carta";
import { CandadoAbierto, Precio } from "./EditorAvatar";
import "../estilos-mesas.css";

type Mesa = (typeof MESAS)[number];
const recompensaDe = (m: Mesa) =>
  "recompensa" in m ? (m.recompensa as string | undefined) : undefined;

/** Los grupos del carrusel: las lisas, las de la tienda y las que se ganan en el modo historia. */
const GRUPOS = [
  {
    titulo: "Lisas",
    mesas: MESAS.filter((m) => m.precio === 0 && !recompensaDe(m)),
  },
  { titulo: "De la tienda", mesas: MESAS.filter((m) => m.precio > 0) },
  {
    titulo: "Del modo historia",
    mesas: MESAS.filter((m) => !!recompensaDe(m)),
  },
].filter((g) => g.mesas.length > 0);

/**
 * Elegir la mesa (paño y madera). Arriba, la vitrina: el paño que tocaste, grande, con tres cartas
 * encima. Abajo, un carrusel por grupo, solo con las que tenés: las de la tienda aparecen cuando
 * las comprás (con la tienda de prueba desbloqueada, todas, con un candado abierto) y las del
 * modo historia cuando las ganás.
 */
export function SelectorMesa({
  valor,
  alCambiar,
  tiendaDesbloqueada: dePrueba = false,
}: {
  valor: IdMesa;
  alCambiar: (mesa: IdMesa) => void;
  tiendaDesbloqueada?: boolean;
}) {
  // Los beta testers también: pueden usar todo lo de la tienda.
  const beta = useEsBeta();
  const tiendaDesbloqueada = dePrueba || beta;
  const [aviso, setAviso] = useState<string | null>(null);
  const tenes = useInventario();
  const [vista, setVista] = useState<IdMesa>(valor);
  useEffect(() => setVista(valor), [valor]);
  const enVitrina = MESAS.find((m) => m.id === vista) ?? MESAS[0]!;
  const estado = (m: Mesa) => {
    const deTienda = m.precio > 0;
    const paga = deTienda && !tiendaDesbloqueada && !tenes.has(idMesa(m.id));
    const recompensa = recompensaDe(m);
    const falta =
      !!recompensa && !tiendaDesbloqueada && !tenes.has(idMesa(m.id));
    return { deTienda, paga, falta, recompensa };
  };
  return (
    <div className="selector-mesa">
      <div className="mesa-vitrina" aria-hidden="true">
        <span
          className="muestra-mesa muestra-mesa-grande"
          data-mesa={enVitrina.id}
        >
          <Carta carta={{ numero: 1, palo: "espada" }} tam="chica" />
          <Carta carta={{ numero: 7, palo: "oro" }} tam="chica" />
          <Carta carta={{ numero: 3, palo: "copa" }} tam="chica" />
        </span>
      </div>
      <p className="mesa-vitrina-texto">
        <strong>{enVitrina.nombre}</strong>
        <small role="status">
          {aviso ??
            `${enVitrina.detalle}. Así se ve la mesa y el fondo de la app.`}
        </small>
      </p>
      <div className="mesas" role="radiogroup" aria-label="Mesa">
        {/* Solo las que tenés: las de la tienda sin comprar y las del modo historia sin ganar no se muestran. */}
        {GRUPOS.map((g) => ({
          ...g,
          mesas: g.mesas.filter((m) => !estado(m).paga && !estado(m).falta),
        }))
          .filter((g) => g.mesas.length > 0)
          .map((g) => (
            <CarruselMesas key={g.titulo} titulo={g.titulo} elegida={valor}>
              {g.mesas.map((m) => {
                const { deTienda, paga, falta, recompensa } = estado(m);
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={valor === m.id}
                    aria-disabled={paga || falta || undefined}
                    aria-label={
                      paga
                        ? `${m.nombre}: ${m.precio} monedas, en la tienda`
                        : falta
                          ? `${m.nombre}: se gana en ${recompensa}`
                          : m.nombre
                    }
                    title={
                      paga
                        ? `${m.precio} monedas · Buscala en la tienda`
                        : falta
                          ? `Se gana en ${recompensa}, en el modo historia`
                          : m.detalle
                    }
                    data-id-mesa={m.id}
                    className={`mesa-opcion${valor === m.id ? " elegida" : ""}${vista === m.id ? " en-vitrina" : ""}${paga || falta ? " paga" : ""}`}
                    // Las pagas no se eligen, pero se pueden tocar: se ven en la vitrina y avisan cuánto cuestan (o dónde se ganan).
                    onClick={() => {
                      setVista(m.id);
                      if (paga)
                        return setAviso(
                          `La mesa ${m.nombre} cuesta ${m.precio} monedas. Buscala en la tienda.`,
                        );
                      if (falta)
                        return setAviso(
                          `La mesa ${m.nombre} se gana en ${recompensa}, en el modo historia.`,
                        );
                      setAviso(null);
                      alCambiar(m.id);
                    }}
                  >
                    {/* La muestra lleva su propio data-mesa: las variables de color valen solo adentro. */}
                    <span
                      className="muestra-mesa"
                      data-mesa={m.id}
                      aria-hidden="true"
                    />
                    <span className="mesa-nombre">{m.nombre}</span>
                    {paga && <Precio monedas={m.precio} />}
                    {falta && (
                      <span className="pieza-precio" aria-hidden="true">
                        🔒
                      </span>
                    )}
                    {deTienda && !paga && <CandadoAbierto />}
                  </button>
                );
              })}
            </CarruselMesas>
          ))}
      </div>
    </div>
  );
}

/** Un grupo de mesas que se desliza de costado; arranca mostrando la elegida, si está en el grupo. */
function CarruselMesas({
  titulo,
  elegida,
  children,
}: {
  titulo: string;
  elegida: IdMesa;
  children: ReactNode;
}) {
  const carril = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = carril.current;
    const boton = c?.querySelector<HTMLElement>(`[data-id-mesa="${elegida}"]`);
    // Solo el carril, de costado: scrollIntoView movería también la pantalla.
    if (c && boton)
      c.scrollLeft = boton.offsetLeft - (c.clientWidth - boton.offsetWidth) / 2;
    // Solo al abrir: después, el carril queda donde lo dejaste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="mesa-grupo">
      <span className="mesa-grupo-titulo" aria-hidden="true">
        {titulo}
      </span>
      <div className="mesa-carril" ref={carril}>
        {children}
      </div>
    </div>
  );
}
