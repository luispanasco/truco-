# Instructivo: cómo está publicado el truco

La app anda en **https://truco.luisalbertopanasco.workers.dev**, desde cualquier celular, sin depender de tu PC.

| Parte | Dónde | Dirección | Costo |
| --- | --- | --- | --- |
| La web (la app instalable) | Cloudflare Workers, Worker `truco` | `truco.luisalbertopanasco.workers.dev` | Gratis |
| El servidor de juego (salas, cuentas, monedas) | Fly.io, app `truco-uy`, en São Paulo | `truco-uy.fly.dev` | Unos 3 o 4 USD por mes |
| Base de datos y login | Supabase, en São Paulo | `oqdbvefzhsxodytqaqpo.supabase.co` | Gratis |
| Servidor de respaldo de la voz | TURN de Cloudflare | — | Gratis hasta 1000 GB |

---

## Publicar una versión nueva

- **La web:** se publica sola cada vez que se sube algo a `main` en GitHub. Cloudflare compila con `pnpm --filter @truco/web build` y publica `apps/web/dist` con `npx wrangler deploy`, según `wrangler.jsonc`.
- **El servidor:** desde la carpeta del proyecto,
  ```
  fly deploy --app truco-uy --ha=false
  ```
  Tiene que quedar **una sola máquina**: las salas viven en su memoria. Cada deploy corta las partidas que estén en juego, así que conviene hacerlo en horarios tranquilos.

---

## Cómo está configurado (por si hay que rehacerlo)

### Fly.io
- Cuenta con GitHub (luispanasco) y tarjeta en Billing. El programa `fly` ya está instalado en tu PC; para entrar: `fly auth login`.
- Los secretos del servidor salen de `apps/server/.env`. Los carga el usuario, porque Claude Code no puede escribir secretos. En PowerShell, desde la carpeta del proyecto:
  ```powershell
  Get-Content apps/server/.env | Select-String '^(SUPABASE_URL|DATABASE_URL|TRUCO_TURN_ID|TRUCO_TURN_TOKEN)=.+' | ForEach-Object { $_.Line } | fly secrets import --app truco-uy --stage
  ```
  Con `fly secrets list --app truco-uy` se ven los nombres, nunca los valores.
- Para comprobar que anda: `https://truco-uy.fly.dev/api/estado` tiene que responder `{"cuentas":true,"loginDePrueba":false}`.

### Cloudflare Workers (la web)
- Worker `truco`, conectado al repo `luispanasco/truco-`, rama `main`.
- **Settings → Build:**
  - Build command: `pnpm --filter @truco/web build`
  - Deploy command: `npx wrangler deploy`
- **Variables de build** (Build → Variables and secrets, no las de "cuando corre"):

  | Nombre | Valor |
  | --- | --- |
  | `NODE_VERSION` | `24` |
  | `PNPM_VERSION` | `10.34.6` |
  | `VITE_SERVIDOR` | `wss://truco-uy.fly.dev` |
  | `VITE_SUPABASE_URL` | `https://oqdbvefzhsxodytqaqpo.supabase.co` |
  | `VITE_SUPABASE_PUBLISHABLE_KEY` | la de `apps/web/.env.local` (es pública: va dentro de la web) |

### Supabase
- **Authentication → URL Configuration:**
  - Site URL: `https://truco.luisalbertopanasco.workers.dev`
  - Redirect URLs: `https://truco.luisalbertopanasco.workers.dev/**` (más las de desarrollo: `localhost`, la red de casa y el túnel).
- Las tablas tienen RLS prendida y sin permisos para la API pública (migración 6): la clave publicable no deja leer ni escribir nada. Solo el servidor entra a la base.
- **Ojo:** en el plan gratis, Supabase **pausa el proyecto** después de 7 días sin uso. Si el servidor no arranca con "tenant/user … not found", entrá al panel y tocá **Restore project**.

### Google (Plataforma de Google Auth, proyecto "Truco Uruguayo")
- **Información de la marca:**
  - Página principal: `https://truco.luisalbertopanasco.workers.dev`
  - Política de privacidad: `https://truco.luisalbertopanasco.workers.dev/privacidad`
  - Dominios autorizados: `luisalbertopanasco.workers.dev` y el de Supabase.
  - **Sin logo:** con logo, Google pide una verificación que tarda semanas.
- **Público:** publicada ("En producción"): puede entrar cualquiera con Google.

---

## Beta testers

Pueden usar todo lo de la tienda sin comprarlo. Lo decide su cuenta en la base, no el navegador.

1. El tester abre la app y entra una vez con Google: la cuenta se crea sola.
2. Desde `apps/server`:
   ```
   pnpm beta lista                       las cuentas, con saldo y si son beta
   pnpm beta marcar ana@gmail.com        lo hace beta tester
   pnpm beta sacar ana@gmail.com         vuelve a valer solo lo que compró
   pnpm beta monedas ana@gmail.com 500   le carga monedas (negativo, descuenta)
   ```
3. El tester lo ve al volver a abrir la app o al entrar a una sala.

La tienda de prueba ("🧪 Pruebas" en Ajustes) solo existe en desarrollo.

---

## App de Android

Es una TWA: abre la web publicada a pantalla completa. **Se actualiza sola** con cada deploy de la web; solo hace falta generar otra APK si cambian el dominio, el ícono, el nombre o la versión para Play Store.

- Proyecto: `android/` (paquete `uy.truco.app`). La configuración está en `android/twa-manifest.json`.
- **Llave de firma:** `secretos/android/truco.keystore` (contraseña en `LEEME-llave.txt`, en la misma carpeta). **Respaldala fuera de la PC**: si se pierde, no se puede actualizar más la app en Play Store.
- **Generar de nuevo** (en PowerShell, desde `android/`):
  ```powershell
  Remove-Item Env:NoDefaultCurrentDirectoryInExePath -ErrorAction SilentlyContinue
  npx @bubblewrap/cli@1.27.0 update      # si cambiaste twa-manifest.json (sube la versión)
  npx @bubblewrap/cli@1.27.0 build       # pide la contraseña de la llave
  ```
  Sale `app-release-signed.apk` (para instalar directo) y `app-release-bundle.aab` (para Play Store).
- **Para instalarla:** pasá la APK por WhatsApp o Drive; en el celular, al abrirla, Android pide permitir "instalar apps de orígenes desconocidos".
