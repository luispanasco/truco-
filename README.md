# Truco uruguayo

App de truco uruguayo con muestra, piezas y flor, bots en tres niveles y partidas online.
La especificación está en [App Truco Uruguayo — Especificación y prompts.md](App%20Truco%20Uruguayo%20—%20Especificación%20y%20prompts.md)
y el avance de cada etapa en [BITACORA.md](BITACORA.md).

## Preparar

Hace falta Node 24 y pnpm 10 (`npm i -g pnpm`). Después, en la carpeta del proyecto:

```
pnpm install
```

## Probar

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Levanta el servidor y la web juntos (lo más cómodo para probar). |
| `pnpm test` | Corre todos los tests (motor, bots, servidor y web) y la prueba de humo del servidor. |
| `pnpm cli [semilla]` | Juega una mano en la terminal contra un rival al azar, sin servidor. |
| `pnpm simular --a dificil --b medio --n 200 --formato 2v2` | Partidas bot contra bot y porcentaje de victorias. |
| `pnpm servidor` | Levanta el servidor de juego en `ws://localhost:2567` (queda corriendo; se corta con Ctrl+C). Ojo: `pnpm server`, en inglés, es un comando propio de pnpm y no hace nada acá. |
| `pnpm jugar` | Cliente de terminal para jugar online contra el servidor. |
| `pnpm --filter @truco/web e2e` | Tests de punta a punta: levanta servidor y web, y juegan dos navegadores. |
| `pnpm web` | Levanta la app web en `http://localhost:5173`. Desde el celular, en la misma red wifi: `http://IP-de-tu-compu:5173`. |

### Jugar online en la terminal

1. En una terminal: `pnpm servidor`.
2. En otra: `pnpm jugar`, elegí un apodo y "Crear una sala privada". Te muestra un código de 5 letras.
3. En una tercera (o en otra compu de la misma red, con `--servidor ws://IP-de-tu-compu:2567`): `pnpm jugar` y "Unirme a una sala con código".
4. El anfitrión escribe `iniciar`. Los lugares vacíos se llenan con bots.

Dentro de la partida: el número elige una opción, `/c texto` es chat general, `/e texto` chat de equipo,
`/s` muestra las señas y `/s número` hace una, `/salir` sale. Para volver a una partida después de cerrar:
`pnpm jugar --id <tu ID>` (el ID se muestra al entrar).

Para probar más rápido, que los bots jueguen sin demora:

```
# PowerShell
$env:TRUCO_BOT_MS=0; pnpm servidor
# bash
TRUCO_BOT_MS=0 pnpm servidor
```

### Playground

Con el servidor prendido, `http://localhost:2567/playground` abre la página de prueba de Colyseus:
muestra las salas abiertas y deja conectarse y mandar mensajes a mano.
