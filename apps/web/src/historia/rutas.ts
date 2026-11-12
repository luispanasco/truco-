/** A dónde se va en el modo historia: el barrio (sin barrio, el departamento) y un nivel de ahí. */
export const rutaBarrio = (departamento: string, barrio = '') => `/historia/${departamento}${barrio ? `/${barrio}` : ''}`
export const rutaNivel = (departamento: string, barrio: string, n: number) => `${rutaBarrio(departamento, barrio)}/${n}`
