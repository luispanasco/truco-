# Instructivo: publicar el truco

Al final vas a tener un link fijo, por ejemplo `https://truco-uy.pages.dev`, que anda desde cualquier celular sin depender de tu PC ni del túnel.

| Parte | Dónde | Costo |
| --- | --- | --- |
| La web (la app instalable) | Cloudflare Pages | Gratis |
| El servidor de juego (salas, cuentas, monedas) | Fly.io, en São Paulo | Unos 3 o 4 USD por mes |
| Base de datos y login | Supabase (ya está) | Gratis |
| Servidor de respaldo de la voz | TURN de Cloudflare (ya está) | Gratis hasta 1000 GB |

La configuración del servidor ya está armada en el repo (`Dockerfile` y `fly.toml`) y la probé en tu PC con Docker. Vos creás las cuentas y yo hago los comandos.

---

## 1. Fly.io: crear la cuenta (vos)

1. Entrá a https://fly.io/app/sign-up y registrate con GitHub, usando luispanasco.
2. En **Billing**, cargá una tarjeta. Fly la pide para crear servidores, aunque cobra según el uso.
3. El programa de Fly ya está instalado en tu PC (`fly` v0.4.118), así que este paso se saltea. Si algún día lo necesitás en otra compu, abrí **PowerShell** y pegá:
   ```
   iwr https://fly.io/install.ps1 -useb | iex
   ```
4. Abrí PowerShell y entrá a tu cuenta:
   ```
   fly auth login
   ```
   Se abre el navegador: confirmá ahí.
5. Avisame "listo Fly".

**Después lo hago yo:**
- creo la app `truco-uy` en São Paulo. Si ese nombre está tomado, elijo otro parecido y te aviso;
- cargo las claves de `apps/server/.env` como secretos de Fly, sin mostrarlas;
- publico el servidor y verifico que responda en `https://truco-uy.fly.dev/api/estado`.

---

## 2. Cloudflare Pages: la web (vos, unos 5 minutos)

Hacelo después de que el servidor de Fly esté andando, así ya sabemos su dirección.

1. Entrá a https://dash.cloudflare.com, que es la misma cuenta del TURN.
2. Andá a **Workers & Pages → Create** y elegí la pestaña **Pages**. Si solo ves Workers, buscá el link "Looking to deploy Pages? Get started".
3. Tocá **Connect to Git** y conectá GitHub. Elegí el repo **`luispanasco/truco-`**.
4. Configuración:
   - **Project name:** `truco-uy`. Ese nombre da el link `truco-uy.pages.dev`.
   - **Production branch:** `main`.
   - **Framework preset:** None.
   - **Build command:** `pnpm --filter @truco/web build`
   - **Build output directory:** `apps/web/dist`
   - **Root directory:** vacío, es la raíz.
5. Abrí **Environment variables** y agregá estas cuatro:

   | Nombre | Valor |
   | --- | --- |
   | `NODE_VERSION` | `24` |
   | `VITE_SERVIDOR` | `wss://truco-uy.fly.dev`, o el nombre que te pase en el paso 1 |
   | `VITE_SUPABASE_URL` | `https://oqdbvefzhsxodytqaqpo.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | la misma de `apps/web/.env.local` |

6. Tocá **Save and Deploy**. Tarda unos minutos.

Desde ahí, cada vez que subamos cambios a `main` en GitHub, Cloudflare publica la web nueva sola.

---

## 3. Supabase: permitir el link nuevo (vos, 1 minuto)

En **Authentication → URL Configuration**:

- **Site URL:** `https://truco-uy.pages.dev`
- **Redirect URLs:** agregá estas dos, sin borrar las que ya están:
  - `https://truco-uy.pages.dev/**`
  - `https://*.truco-uy.pages.dev/**` (las versiones de prueba de Cloudflare)

---

## 4. Google: que entre cualquiera (vos, 1 minuto)

Hoy solo pueden entrar con Google los mails que cargaste como **Test users**. Para abrirlo a todos:

1. En https://console.cloud.google.com, con el proyecto **Truco Uruguayo**, andá a **Google Auth Platform → Audience** (o **OAuth consent screen**).
2. Tocá **Publish app** y confirmá.

Como la app solo pide el mail y el nombre, Google no pide revisión.

**No subas un logo** en la pantalla de consentimiento (Branding → App logo): con logo, Google pide una verificación que tarda semanas y mientras tanto muestra un aviso de "app no verificada".

---

## 5. Probar

Abrí `https://truco-uy.pages.dev` en el celular, entrá con Google y jugá una partida. En el navegador del celular podés tocar **Agregar a la pantalla de inicio** para tenerla como app.

Si algo no anda, pasame el mensaje de error.
