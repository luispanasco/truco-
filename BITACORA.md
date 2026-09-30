# Bitácora del proyecto

Registro de cada etapa del proyecto: qué se hizo, qué se decidió y qué quedó pendiente. La especificación completa está en [App Truco Uruguayo — Especificación y prompts.md](App%20Truco%20Uruguayo%20—%20Especificación%20y%20prompts.md).

Cada etapa se revisa antes de arrancar: primero se presenta el plan, se aprueba y recién después se programa.

## Estado general

| Etapa | Contenido | Estado | Cierre | Commit |
| --- | --- | --- | --- | --- |
| Reglas | Confirmación de las reglas configurables | Hecha | 2026-09-30 | — |
| 1A | Motor de reglas | Hecha | 2026-09-30 | `55961aa` |
| 1B | Bots | Hecha | 2026-09-30 | ver abajo |
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

---

## Señas — 2026-09-30

Se definió la lista de señas de las mesas del usuario (quedó en la sección "Señas" de la especificación). Hay una seña por carta, más la de la flor:

| Carta | Seña |
| --- | --- |
| 2 de la muestra | Levantar las cejas |
| 4 de la muestra | Beso |
| 5 de la muestra | Fruncir la nariz |
| Perico (11) | Guiño derecho |
| Perica (10) | Guiño izquierdo |
| 1 de espadas o 1 de bastos | Mueca con la pera hacia la derecha |
| 7 de espadas o 7 de oros | Mueca con la pera hacia la izquierda |
| Un 3 | Morderse el labio inferior |
| Un 2 que no es pieza | Abrir la boca |
| 1 de copas o 1 de oros | Sacar la lengua |
| Flor | Inflar la boca como un sapo |

El resto de las cartas no tiene seña. Los unos bravos comparten seña, y lo mismo los sietes bravos.

---

## Etapa 1B: bots — 2026-09-30

### Qué se hizo

- Paquete `packages/bots` con `crearBot(nivel, semilla)`. Cada bot tiene dos funciones:
  - `decidir(vista, senias)` recibe solo la `vistaPara` de su jugador y las señas de su equipo, nunca el estado completo.
  - `hacerSenias(vista)` devuelve las señas del jugador al empezar la mano.
- Tres niveles:
  - **Fácil:** tira la más baja que gana la vuelta; canta envido con 30 o más y truco con dos bravas; casi nunca sube.
  - **Medio:** estima la fuerza de su propia mano imaginando manos ajenas al azar. Canta con umbrales fijos, va de farol una de cada siete veces y juega con reglas: guarda la brava si ganó la primera y le deja la vuelta al compañero que le señó que puede matar.
  - **Difícil:** imagina manos ajenas coherentes con todo lo que sabe (cartas vistas, tantos declarados, flor, señas del compañero) y las pesa según lo probable que es que el rival haya cantado lo que cantó. Con cada una simula el resto de la mano jugando perfecto (minimax) y decide por valor esperado.
- El difícil ya trae programado mentir en el tanto y pedir ver, pero apagado (`permitirMentiras: false`) hasta la fase 3.
- Simulador: `pnpm simular --a dificil --b medio --n 1000 --formato 2v2 --procesos 6`. Alterna equipos y reparto, y da lo mismo con cualquier cantidad de procesos.

### Criterio (1000 partidas cada uno, semilla 2026)

| Enfrentamiento | 1v1 | 2v2 | Mínimo |
| --- | --- | --- | --- |
| Difícil contra medio | 64,0% ± 3,0% | 67,7% ± 2,9% | 60% |
| Medio contra fácil | 69,2% ± 2,9% | 68,5% ± 2,9% | 65% |

### Tests (13, más los 123 del motor)

- Con fast-check, partidas enteras con bots de cualquier nivel, en cualquier formato y configuración: siempre eligen acciones válidas y terminan.
- La misma semilla reproduce la misma partida.
- Las señas de cada mano, incluidos los casos en que la muestra es pieza.
- El difícil no quiere un vale cuatro que no puede ganar, y las manos que imagina para el compañero respetan sus señas.
- El medio le deja la vuelta al compañero que le señó un uno bravo y, si el compañero no hizo ninguna seña, mata él.
- El fácil casi nunca sube el truco y nunca sube el envido.
- Sin mentiras habilitadas, en modo sucio declaran siempre el tanto real y nunca piden ver.

### Decisiones

1. La interfaz quedó `decidir(vista, senias)` en vez de `decidir(vista, config)` como decía el prompt: la configuración viene dentro de la vista y las señas no las guarda el motor.
2. Las señas no entran al motor porque no cambian el estado del juego. Las reparte el simulador, y en la 1C las va a repartir el servidor, siempre solo al propio equipo. En 1v1 y en los duelos de pica-pica no hay señas.
3. Todos los niveles hacen sus señas honestas; lo que cambia entre niveles es cómo las leen.
4. El medio usa las señas solo para dejarle la vuelta al compañero, no para calcular probabilidades. Con las señas en sus cálculos, en 2v2 quedaba casi tan bien informado como el difícil (58,8%, abajo del criterio).
5. En 3v3 el difícil simula con la política simple en vez de minimax, porque el árbol de 6 jugadores es muy grande. Los duelos de pica-pica son 1v1 y usan minimax.
6. Cuando responde un equipo, contesta el primero de ese equipo en el orden de la mesa.

### Notas

- Duración aproximada por partida: fácil y medio de 10 a 100 ms; difícil 40 ms en 1v1 y 0,9 s en 2v2 (en un solo proceso).
- Variantes probadas sin mejora medible: cantar truco con menos juego, más farol, más prudencia para querer, más muestras, deducir del envido con más exigencia en equipos, y leer como mano floja que el rival no cante truco.
