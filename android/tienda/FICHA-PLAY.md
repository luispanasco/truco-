# Ficha de Google Play — Truco Uruguayo

Todo lo que pide la consola de Google Play, listo para copiar. Las imágenes están en esta misma carpeta.

## Archivos

| Qué | Archivo | Medida |
|---|---|---|
| App (para subir) | `../app-release-bundle.aab` | — |
| Ícono | `../store_icon.png` | 512 × 512 |
| Imagen destacada | `destacada.png` | 1024 × 500 |
| Capturas del teléfono | `captura-1.png` … `captura-8.png` | 1080 × 1920 |

Las imágenes salen de `promo/` (composiciones `Destacada` y `Captura` en `promo/src/tienda.tsx`). Para rehacerlas:

```
cd promo
npx remotion still src/index.ts Destacada ../android/tienda/destacada.png --frame=45
npx remotion still src/index.ts Captura ../android/tienda/captura-1.png --frame=45 --props='{"indice":0}'
```

## Textos

**Nombre de la app** (hasta 30): `Truco Uruguayo`

**Descripción corta** (hasta 80):

> El truco de acá: con muestra, piezas y flor. Online, contra la compu y más.

**Descripción completa** (hasta 4000):

> Truco Uruguayo es el truco como se juega acá: con muestra, piezas, flor y las señas de siempre, con la baraja española de 40 cartas.
>
> JUGÁ COMO QUIERAS
> • Online con gente de verdad: mano a mano, en parejas o de a tres.
> • Armá tu dúo o tu trío con amigos y salgan juntos a buscar rivales.
> • Salas privadas con código para jugar con tu barra, con chat de voz.
> • Contra la compu, con bots de varios niveles, cuando quieras.
>
> TRUCO URUGUAYO DE VERDAD
> • Muestra y piezas: el 2, 4, 5, 11 y 10 del palo de la muestra.
> • Flor, contraflor y contraflor al resto.
> • Envido, real envido y falta envido; truco, retruco y vale cuatro.
> • Señas al compañero, y el pie que manda en equipos.
>
> MODO HISTORIA
> Recorré Uruguay barrio por barrio. Arrancá en Rocha: La Paloma, La Pedrera, Cabo Polonio, Aguas Dulces, Valizas, Castillos, Punta del Diablo, Santa Teresa y el Chuy, con 32 lugares de verdad y la gente de cada lugar esperándote en la mesa. Se vienen más departamentos.
>
> ¿NO SABÉS JUGAR?
> Don Queiroz te enseña desde cero: la baraja, qué carta mata a cuál, la muestra, el envido, la flor y las señas, con ejercicios. Al final te recibís de truquero.
>
> HACELO TUYO
> • Armá tu avatar.
> • Elegí paños y mazos de todo el país.
> • Juntá monedas jugando y gastalas en la tienda.
> • Sumá amigos, armá grupos con su muro y su chat, y subí en el ranking.
>
> Entrá con tu cuenta de Google o con tu email y tu progreso te sigue a cualquier celular.
>
> Hecho en Uruguay.

**Categoría:** Juegos → Cartas.
**Etiquetas:** cartas, truco, multijugador.
**Email de contacto:** luisalbertopanasco@gmail.com
**Política de privacidad:** https://truco.luisalbertopanasco.workers.dev/privacidad
**Borrar la cuenta (link web):** https://truco.luisalbertopanasco.workers.dev/borrar-cuenta

## Clasificación de contenido (cuestionario IARC)

- Categoría: **Juego**.
- Violencia, sexo, drogas, lenguaje vulgar: **no**.
- **Apuestas simuladas: no.** No se apuesta nada: las monedas se ganan jugando y solo compran cosméticos; no se compran con dinero ni se cambian por dinero.
- **Los usuarios interactúan entre sí: sí.** Hay chat de texto y de voz con otras personas en las partidas y en los grupos. Hay filtro de palabras, se puede silenciar y reportar.
- Comparte la ubicación: **no**.
- Compras digitales: **no** (por ahora).

## Público objetivo

- Edades: **13 a 15, 16 a 17 y 18 o más** (la política de privacidad dice que no es para menores de 13).
- ¿Puede atraer a niños sin querer? **No**: es un juego de cartas tradicional, sin personajes infantiles.

## Seguridad de los datos

**¿Recopila o comparte datos?** Recopila, **no comparte** con terceros. Todo viaja cifrado (HTTPS/WSS). **Se puede pedir que se borren:** sí (en la app y en el link web de arriba).

| Tipo de dato | Recopilado | Para qué | ¿Obligatorio? |
|---|---|---|---|
| Información personal → **Dirección de correo** | Sí | Administración de la cuenta | Opcional (se juega sin cuenta) |
| Información personal → **Nombre** (el apodo) | Sí | Funcionalidad de la app, administración de la cuenta | Opcional |
| Información personal → **IDs de usuario** | Sí | Funcionalidad de la app, administración de la cuenta | Obligatorio (el ID de invitado) |
| Mensajes → **Otros mensajes en la app** (chat de grupos y de la mesa) | Sí | Funcionalidad de la app | Opcional |
| Audio → **Grabaciones de voz** | **No**: la voz va directo entre los jugadores (WebRTC) y no se guarda | — | — |
| Actividad en la app → **Interacciones en la app** (partidas, progreso, Elo) | Sí | Funcionalidad de la app | Obligatorio |
| Información y rendimiento de la app → **Registros de fallos / diagnóstico** (los reportes de problemas que manda la persona) | Sí | Análisis, corregir errores | Opcional |

No usa publicidad, ni datos de ubicación, ni contactos, ni fotos (salvo la foto de un grupo, que sube el líder a propósito: Fotos → recopilado, funcionalidad, opcional).

## Otras preguntas de la consola

- **Anuncios:** no tiene.
- **Acceso a la app:** se puede jugar sin cuenta. Si la revisión pide una cuenta, que entren con "Entrar con Google" con cualquier cuenta de Google.
- **App gubernamental / financiera / de salud:** no.
- **Permisos:** solo internet; el micrófono lo pide el navegador recién al prender el chat de voz.

## Antes de subir: las asset links (que no se vea la barra del navegador)

Play vuelve a firmar la app con su llave. Hay que agregar la huella de esa llave en `apps/web/public/.well-known/assetlinks.json`:

1. En la consola: **Prueba y lanzamiento → Configuración → Integridad de la app → Firma de apps**. Copiá el **certificado SHA-256 de la clave de firma de apps**.
2. Pasáselo a Claude (o agregalo a mano en `sha256_cert_fingerprints`, **sin sacar** el que ya está, que es el de la APK que se instala directo).
3. Publicar la web (main). Después de un rato, abrir la app instalada desde Play: no tiene que verse la barra de dirección.

## Prueba cerrada (cuentas personales)

Con una cuenta de desarrollador personal, Google pide una **prueba cerrada con al menos 12 testers durante 14 días seguidos** antes de dejar publicar en producción.
- **Prueba y lanzamiento → Prueba cerrada → Crear pista.** Subir el `.aab` ahí.
- En **Testers**, una lista de emails (cuentas de Google) de los beta testers.
- Les mandás el link de unirse a la prueba; cada uno lo acepta y la instala desde Play. Tienen que quedar 12 o más durante los 14 días.
- Después, en el panel aparece **Solicitar acceso a producción**.
