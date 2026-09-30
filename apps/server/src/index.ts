import { crearServidor } from './servidor'

const puerto = Number(process.env.PORT ?? 2567)
const servidor = crearServidor()
await servidor.listen(puerto)
console.log(`Servidor de truco escuchando en ws://localhost:${puerto}`)
