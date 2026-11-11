import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Carta as TCarta } from "@truco/engine";
import { idBaraja } from "@truco/shared";
import { BARAJAS, mostrarBaraja, type Baraja } from "../baraja";
import { useEsBeta, useInventario } from "../cuenta/inventario";
import { Carta } from "./Carta";

/** Las cuatro cartas de la vitrina: los dos ases más altos, un 7 y un rey, en abanico. */
const VITRINA: TCarta[] = [
  { numero: 1, palo: "espada" },
  { numero: 1, palo: "basto" },
  { numero: 7, palo: "oro" },
  { numero: 12, palo: "copa" },
];
/** La carta de cada mazo en el carrusel: el 1 de espadas, que es el que más cambia de uno a otro. */
const MINIATURA: TCarta = { numero: 1, palo: "espada" };

/** Los grupos del carrusel: las de siempre y las que se ganan en el modo historia. */
const GRUPOS = [
  { titulo: "Clásicas", barajas: BARAJAS.filter((b) => !b.recompensa) },
  {
    titulo: "Del modo historia",
    barajas: BARAJAS.filter((b) => !!b.recompensa),
  },
];

/**
 * Elegir la baraja (cosmético). Arriba, la vitrina: el mazo que tocaste en abanico, grande, con su
 * nombre y su crédito (o dónde se gana). Abajo, un carrusel por grupo con una carta de cada mazo.
 * `alElegir` la guarda donde corresponda (el perfil); además todas las cartas de la app se
 * redibujan al momento. Las que se ganan en el modo historia no aparecen hasta que las ganás
 * (los beta las usan igual). `children` va
 * abajo de la vitrina (por ejemplo, "Ver las cartas").
 */
export function SelectorBaraja({
  baraja,
  alElegir,
  children,
}: {
  baraja: Baraja;
  alElegir: (b: Baraja) => void;
  children?: ReactNode;
}) {
  const beta = useEsBeta();
  const tenes = useInventario();
  // La que se ve en la vitrina: la elegida o la última que tocaste (aunque no la tengas).
  const [vista, setVista] = useState<Baraja>(baraja);
  useEffect(() => setVista(baraja), [baraja]);
  const falta = (b: (typeof BARAJAS)[number]) =>
    !!b.recompensa && !beta && !tenes.has(idBaraja(b.id));
  const enVitrina = BARAJAS.find((b) => b.id === vista) ?? BARAJAS[0]!;
  const vitrinaFalta = falta(enVitrina);
  return (
    <div className="selector-baraja">
      <div
        className={`baraja-vitrina${vitrinaFalta ? " bloqueada" : ""}`}
        aria-hidden="true"
      >
        <span className="baraja-abanico">
          {VITRINA.map((c) => (
            <Carta
              key={`${c.numero}-${c.palo}`}
              carta={c}
              baraja={enVitrina.id}
            />
          ))}
        </span>
      </div>
      <p className="baraja-vitrina-texto" role="status">
        <strong>{enVitrina.nombre}</strong>
        {vitrinaFalta ? (
          <small>
            🔒 Se gana en {enVitrina.recompensa}, en el modo historia
          </small>
        ) : (
          <small>
            {vista === baraja
              ? (enVitrina.credito ?? "La de la app")
              : "Tocala de nuevo para elegirla"}
          </small>
        )}
      </p>
      {children}
      <div
        className="selector-baraja-opciones"
        role="radiogroup"
        aria-label="Baraja"
      >
        {/* Solo las que tenés: las bloqueadas (las del modo historia que no ganaste) no se muestran. */}
        {GRUPOS.map((g) => ({
          ...g,
          barajas: g.barajas.filter((b) => !falta(b)),
        }))
          .filter((g) => g.barajas.length > 0)
          .map((g) => (
            <CarruselBarajas key={g.titulo} titulo={g.titulo} elegida={baraja}>
              {g.barajas.map((b) => {
                const bloqueada = falta(b);
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="radio"
                    aria-checked={baraja === b.id}
                    aria-disabled={bloqueada || undefined}
                    aria-label={
                      bloqueada
                        ? `${b.nombre}: se gana en ${b.recompensa}`
                        : b.credito
                          ? `${b.nombre} (${b.credito})`
                          : b.nombre
                    }
                    data-baraja={b.id}
                    className={`baraja-opcion${baraja === b.id ? " elegido" : ""}${vista === b.id ? " en-vitrina" : ""}${bloqueada ? " bloqueada" : ""}`}
                    onClick={() => {
                      // El primer toque la muestra en la vitrina; si la tenés, además la elige.
                      setVista(b.id);
                      if (bloqueada) return;
                      alElegir(b.id);
                      mostrarBaraja(b.id);
                    }}
                  >
                    <span className="baraja-miniatura" aria-hidden="true">
                      <Carta carta={MINIATURA} baraja={b.id} />
                      {bloqueada && <span className="baraja-candado">🔒</span>}
                    </span>
                    <span className="baraja-opcion-nombre" aria-hidden="true">
                      {b.nombre}
                    </span>
                  </button>
                );
              })}
            </CarruselBarajas>
          ))}
      </div>
    </div>
  );
}

/** Un grupo de mazos que se desliza de costado; arranca mostrando el elegido, si está en el grupo. */
function CarruselBarajas({
  titulo,
  elegida,
  children,
}: {
  titulo: string;
  elegida: Baraja;
  children: ReactNode;
}) {
  const carril = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = carril.current;
    const boton = c?.querySelector<HTMLElement>(`[data-baraja="${elegida}"]`);
    // Solo el carril, de costado: scrollIntoView movería también la pantalla.
    if (c && boton)
      c.scrollLeft = boton.offsetLeft - (c.clientWidth - boton.offsetWidth) / 2;
    // Solo al abrir: después, el carril queda donde lo dejaste.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="baraja-grupo">
      <span className="baraja-grupo-titulo" aria-hidden="true">
        {titulo}
      </span>
      <div className="baraja-carril" ref={carril}>
        {children}
      </div>
    </div>
  );
}
