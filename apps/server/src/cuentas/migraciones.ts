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
  // 2. Monedas: cada movimiento es un registro que no se cambia ni se borra; el saldo es la suma.
  //    Una partida paga una sola vez cada concepto a cada cuenta (el índice único lo asegura).
  `
  create table movimientos (
    id bigint generated always as identity primary key,
    cuenta_id uuid not null references cuentas (id),
    monto integer not null,
    tipo text not null check (tipo in ('partida', 'victoria', 'bonusDiario', 'compra', 'ajuste')),
    partida text,
    detalle jsonb not null default '{}',
    creado timestamptz not null default now()
  );
  create index movimientos_cuenta on movimientos (cuenta_id, creado);
  create unique index movimientos_una_vez on movimientos (cuenta_id, partida, tipo) where partida is not null;
  create function movimientos_inmutables() returns trigger language plpgsql as $$ begin raise exception 'Los movimientos de monedas no se cambian ni se borran'; end $$;
  create trigger movimientos_inmutables before update or delete on movimientos for each row execute function movimientos_inmutables();
  `,
  // 3. Elo por formato (solo partidas entre personas con cuenta) y su historial por partida.
  `
  create table elo (
    cuenta_id uuid not null references cuentas (id),
    formato text not null,
    puntos integer not null,
    partidas integer not null default 0,
    ganadas integer not null default 0,
    actualizada timestamptz not null default now(),
    primary key (cuenta_id, formato)
  );
  create index elo_ranking on elo (formato, puntos desc);
  create table elo_partidas (
    cuenta_id uuid not null references cuentas (id),
    partida text not null,
    formato text not null,
    antes integer not null,
    despues integer not null,
    creado timestamptz not null default now(),
    primary key (cuenta_id, partida)
  );
  `,
  // 4. Inventario: lo comprado en la tienda, para siempre (lo que se pagó queda en movimientos).
  `
  create table inventario (
    cuenta_id uuid not null references cuentas (id),
    item text not null,
    precio integer not null,
    comprado timestamptz not null default now(),
    primary key (cuenta_id, item)
  );
  `,
  // 5. Amigos: cada cuenta tiene un código para que la agreguen; la amistad es una fila (de quien
  //    la pidió a quien la recibe), pendiente hasta que la acepta.
  `
  alter table cuentas add column codigo text unique;
  create table amistades (
    de uuid not null references cuentas (id),
    a uuid not null references cuentas (id),
    estado text not null check (estado in ('pendiente', 'aceptada')),
    creada timestamptz not null default now(),
    primary key (de, a)
  );
  create index amistades_a on amistades (a);
  `,
]
