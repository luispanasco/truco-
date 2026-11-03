/**
 * La web es de archivos estáticos (apps/web/dist); este Worker solo corre cuando un pedido no es
 * un archivo. En producción eso no pasa: `not_found_handling` ya devuelve el index.html. Las
 * previews de Cloudflare (develop) no lo respetan, y las rutas de la app (/ranking, /s/CODIGO…)
 * daban 404: acá, si la página no existe, se sirve el index.html y la app arma la pantalla.
 */
export default {
  async fetch(pedido, env) {
    const respuesta = await env.ASSETS.fetch(pedido)
    const esPagina = pedido.method === 'GET' && (pedido.headers.get('accept') ?? '').includes('text/html')
    if (respuesta.status !== 404 || !esPagina) return respuesta
    // "/" y no "/index.html": los assets redirigen /index.html a /, y acá se quiere la página tal cual.
    return env.ASSETS.fetch(new Request(new URL('/', pedido.url), pedido))
  },
}
