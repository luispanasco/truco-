/**
 * El esquema de la base, migración por migración. Nunca se cambia una que ya está aplicada en
 * algún lado: los cambios van en una nueva al final. Las sentencias se separan con `;` al final
 * de la línea.
 */
export const MIGRACIONES: string[] = [
  // 1. Cuentas (el id es el del usuario en Supabase Auth) y los invitados que se vincularon.
  `
  create table cuentas (
    id uuid primary key,
    email text,
    apodo text not null,
    avatar text,
    preferencias jsonb not null default '{}',
    creada timestamptz not null default now(),
    actualizada timestamptz not null default now()
  );
  create table invitados (
    invitado_id text primary key,
    cuenta_id uuid not null references cuentas (id),
    vinculado timestamptz not null default now()
  );
  create index invitados_cuenta on invitados (cuenta_id);
  `,
]
