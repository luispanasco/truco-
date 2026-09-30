# Bitácora del proyecto

Registro de cada etapa del proyecto: qué se hizo, qué se decidió y qué quedó pendiente. La especificación completa está en [App Truco Uruguayo — Especificación y prompts.md](App%20Truco%20Uruguayo%20—%20Especificación%20y%20prompts.md).

Cada etapa se revisa antes de arrancar: primero se presenta el plan, se aprueba y recién después se programa.

## Estado general

| Etapa | Contenido | Estado | Cierre | Commit |
| --- | --- | --- | --- | --- |
| Reglas | Confirmación de las reglas configurables | Hecha | 2026-09-30 | — |
| 1A | Motor de reglas | Hecha | 2026-09-30 | `55961aa` |
| 1B | Bots | Plan en revisión | — | — |
| 1C | Servidor | Pendiente | — | — |
| 1D | Interfaz | Pendiente | — | — |
| 1E | Señas, avatares y cantos | Pendiente | — | — |
| Fase 2 | Cuentas, economía y voz | Pendiente | — | — |
| Fase 3 | Modo sucio | Pendiente | — | — |

---

## Reglas configurables — 2026-09-30

Se repasaron las reglas que cambian entre mesas. Quedaron en la especificación y en `ConfigSala`.

| Regla | Decisión |
| --- | --- |
| Flor con piezas | Pieza más alta completa + último dígito de las otras piezas + cartas comunes |
| Flor sin piezas | 20 + la suma de las tres cartas |
| Contraflor | 6; al resto, lo que falta para ganar |
| Falta envido con los dos en malas | Lo que le falta al que va ganando (se descartó "gana el partido") |
| Cantar la flor | Obligatorio en la primera vuelta; si no se canta, se pierde |
| Envido envido | Permitido, y se puede seguir con real envido o falta envido |
| No querer el envido | Lo acumulado antes del último canto (1 si era el primero) |
| Quién empieza tras una parda | El que empezó la vuelta empatada |
| Mazo con envido pendiente | El rival cobra el envido no querido más el truco |
| Pica-pica | Solo en malas; cuando un equipo llega a 16, se vuelve a redondo |

Precisiones sobre la flor y el pica-pica:

- Si solo un equipo tiene flor, suma 3 por cada flor.
- Si los dos equipos tienen flor y nadie canta contraflor, se comparan al final y el equipo con la mayor suma 3 en total.
- Contraflor no querida ("con flor me achico"): el que la cantó se queda con los 3.
- Pica-pica: un solo reparto como en 3v3; tres duelos 1v1 en serie, empezando por el mano contra el de enfrente y siguiendo en sentido antihorario. Cada duelo es una mano completa con truco, envido y flor. Los que juegan después ven las cartas de los duelos anteriores.

---

## Etapa 1A: motor de reglas — 2026-09-30

**Commit:** `55961aa`

### Qué se hizo

- Monorepo con pnpm workspaces y TypeScript estricto. El paquete `packages/engine` es puro: no tiene interfaz ni red.
- `crearPartida` reparte con una semilla (PRNG mulberry32 y mezcla Fisher-Yates). Una partida se repite entera con la semilla y la lista de acciones.
- `apply(estado, accion)` es la única función de transición. Devuelve el estado nuevo y los eventos, o el motivo por el que la acción es inválida, y nunca modifica el estado recibido.
- `accionesValidas(estado, jugador)` dice qué puede hacer cada jugador, para los botones y los bots.
- `esperandoA(estado)` dice a quién espera el juego.
- `vistaPara(estado, jugador)` devuelve solo lo que ese jugador puede ver.
- Reglas implementadas:
  - piezas y el 12 que las reemplaza, y la jerarquía;
  - vueltas y pardas;
  - truco hasta vale cuatro, donde solo sube el que aceptó;
  - envido, real envido y falta envido encadenados, "primero está el envido" y declaración en orden desde el mano;
  - flor, contraflor y contraflor al resto;
  - irse al mazo;
  - partido a 30;
  - formatos 1v1, 2v2 y 3v3 con pica-pica.
- Modo sucio preparado desde ahora: el tanto real y el declarado van separados, y al final de cada mano hay una verificación. En modo normal se resuelve sola; en modo sucio cada equipo puede pedir ver.
- CLI para jugar una mano contra un rival que elige al azar: `pnpm cli [semilla]`.

### Tests (123)

- Jerarquía completa para 40 muestras, incluidas las muestras que son pieza.
- Envido y flor con piezas. El envido máximo de 37 se probó con todas las manos posibles.
- Todos los casos de pardas; turnos y rotación del reparto.
- Truco, envido y flor: secuencias válidas e inválidas, puntos al no querer y mazo con cantos pendientes.
- Pica-pica: orden de los duelos, cartas visibles y vuelta a redondo.
- Propiedades con fast-check, en partidas al azar con configuraciones al azar:
  - siempre terminan en 30 sin trabarse;
  - el puntaje nunca baja;
  - se reproducen idénticas;
  - ninguna vista contiene cartas ajenas;
  - `apply` no modifica el estado recibido.

### Decisiones tomadas donde la especificación no decía nada

1. Si cada equipo gana una vuelta y la tercera es parda, gana el que ganó la primera.
2. El tanto se anota al final de la mano y antes que el truco. Si con el tanto un equipo llega a 30, el truco no se suma.
3. La falta envido querida vale solo la falta, sin sumar los envidos anteriores.
4. Si alguien canta flor, el envido de esa mano se anula aunque ya se haya declarado.
5. Contraflor al resto después de una contraflor, no querida: el que la cantó cobra 6.
6. A un canto le puede responder cualquier jugador del equipo rival.
7. Si se va al mazo el que cantó el envido, ese envido no lo cobra nadie. Si había que comparar flores, pierde la comparación el que se fue.
8. En pica-pica, si un equipo entra en buenas a mitad de la mano, se terminan igual los tres duelos.
9. "Primero está el envido" es cantar envido mientras hay un truco sin responder, no una acción aparte.
10. En modo sucio, la penalidad por mentir es que los puntos de tanto del mentiroso pasan al rival. La flor callada todavía no tiene penalidad: se define en la fase 3.

### Notas

- La opción "quién empieza tras una parda" no cambia nada en la práctica. La única parda que no termina la mano es la de la primera vuelta, y esa siempre la empieza el mano. Quedó como parámetro igual.
- pnpm se instaló con `npm i -g pnpm`, porque corepack pedía permisos de administrador.
