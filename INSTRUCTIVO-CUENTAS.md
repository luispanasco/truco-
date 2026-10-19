# Instructivo: Supabase y login con Google

Son tres partes: el proyecto de Supabase, la credencial de Google, y pegar los datos en dos archivos `.env` de tu compu. Lleva unos 20 minutos.

**Las claves no se pegan en el chat ni se suben a GitHub.** Los archivos `.env` ya están ignorados por git.

## 1. Proyecto en Supabase

1. Entrá a https://supabase.com y creá una cuenta. Podés entrar con GitHub, usando luispanasco.
2. **New project**:
   - Organization: la tuya. Plan **Free**.
   - Project name: `truco`.
   - Database password: tocá **Generate a password** y **guardala** en un gestor de contraseñas. Se usa en el paso 3 y Supabase no la vuelve a mostrar.
   - Region: **South America (São Paulo)**.
   - Tocá **Create new project** y esperá un par de minutos a que termine.
3. Anotá estos datos:
   - **Project URL**: en **Project Settings → Data API**. Tiene la forma `https://abcdefgh.supabase.co`. La parte `abcdefgh` es la *referencia del proyecto* y la vas a usar en el paso 2.
   - **Publishable key**: en **Project Settings → API Keys**. Empieza con `sb_publishable_…`. Si solo ves claves "legacy", usá la `anon`. Esta clave es pública: va en la web.
   - **Cadena de conexión**: tocá el botón **Connect** de arriba y elegí **Session pooler**, que anda con IPv4. Copiá la URI, que tiene la forma `postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`, y reemplazá `[YOUR-PASSWORD]` por la contraseña del paso 2.
   - **No** hace falta la *secret key* ni la *service_role*. El servidor verifica las sesiones con las claves públicas de Supabase.
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:5173`. Cuando publiquemos la app la cambiamos por el dominio real.
   - Redirect URLs, agregá estas tres:
     - `http://localhost:5173/**`
     - `http://192.168.*.*:5173/**`, para entrar desde el celular por la red de casa.
     - `https://*.trycloudflare.com/**`, para el túnel de `pnpm compartir`.
   - Guardá.
5. **Authentication → Sign In / Providers → Email**: dejalo habilitado, con **Confirm email** prendido, y guardá. El correo de prueba de Supabase manda pocos mails por hora. Alcanza para probar; antes de publicar ponemos un proveedor de correo propio.

## 2. Credencial de Google

1. Entrá a https://console.cloud.google.com con tu cuenta de Google.
2. Arriba, en el selector de proyectos, tocá **New project**, ponele de nombre `Truco Uruguayo` y crealo. Después seleccionalo.
3. **APIs & Services → OAuth consent screen**, o **Google Auth Platform**, según la versión de la consola. Tocá **Get started**:
   - App name: `Truco Uruguayo`. User support email: tu mail.
   - Audience: **External**.
   - Contact information: tu mail. Aceptá y tocá **Create**.
4. En **Audience**, mientras la app esté "In testing", agregá como **Test users** los mails que vayan a probar el login: el tuyo y los de tus amigos.
5. **Clients**, o **Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**. Name: `Truco Supabase`.
   - **Authorized JavaScript origins**: `http://localhost:5173`.
   - **Authorized redirect URIs**: `https://abcdefgh.supabase.co/auth/v1/callback`. Usá *tu* referencia del proyecto, del paso 1.3.
   - Tocá **Create** y copiá el **Client ID** y el **Client secret**.
6. Volvé a Supabase, a **Authentication → Sign In / Providers → Google**:
   - Prendé **Enable Sign in with Google**.
   - Pegá el Client ID y el Client secret, y guardá.

## 3. Los archivos `.env`

Los dos archivos ya están creados y tienen los renglones vacíos: completá cada uno después del `=`.

`apps/server/.env`:

```
SUPABASE_URL=https://abcdefgh.supabase.co
DATABASE_URL=postgresql://postgres.abcdefgh:TU-CONTRASEÑA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

`apps/web/.env.local`:

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Cuando estén, avisame "listo". No me pases las claves: yo reinicio el servidor y lo pruebo. Al arrancar, el servidor crea solo las tablas.

**Mientras tanto** el juego no se rompe: sin `DATABASE_URL`, el servidor usa una base local de prueba en `apps/server/datos/base` (con `TRUCO_DIR_BASE=otra/carpeta` usa otra, por ejemplo para probar con un segundo servidor sin tocar la de siempre). Sin las variables de Supabase, la web muestra un "login de prueba" que solo existe en desarrollo.

## 4. TURN de Cloudflare, para el chat de voz

Sin TURN, la voz solo anda si los dos celulares pueden conectarse directo. Con datos móviles, en redes de oficina o en una Wi-Fi que aísla a los dispositivos, se queda en "conectando…". Cloudflare da 1000 GB por mes gratis, y para una charla de truco sobra.

1. Entrá a https://dash.cloudflare.com. Si no tenés cuenta, creá una: es gratis y no pide tarjeta.
2. En el menú de la izquierda, entrá a **Realtime → TURN Server**. Según la versión puede figurar como **Calls → TURN**.
3. Tocá **Create**, ponele de nombre `truco` y confirmá.
4. Te muestra dos datos: el **Turn Token ID** y el **API Token**. Copiá el API Token en el momento, porque después no se vuelve a ver.
5. Agregalos al final de `apps/server/.env`, que si no existe se crea:

```
TRUCO_TURN_ID=el-turn-token-id
TRUCO_TURN_TOKEN=el-api-token
```

Cuando estén, avisame. Reinicio el servidor y al arrancar tiene que decir "Voz: con el TURN de Cloudflare."
