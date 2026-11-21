create table if not exists public.alertas_inmet (
  id text primary key,
  evento text not null,
  severidade text not null,
  nivel smallint not null check (nivel between 0 and 3),
  inicio timestamptz,
  fim timestamptz,
  descricao text not null default '',
  areas text[] not null default '{}',
  link text,
  payload_bruto jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

create index if not exists alertas_inmet_fim_idx
  on public.alertas_inmet (fim);

alter table public.alertas_inmet enable row level security;

create table if not exists public.inmet_sync_status (
  id text primary key check (id = 'rs'),
  atualizado_em timestamptz not null
);

alter table public.inmet_sync_status enable row level security;

create or replace function public.sincronizar_alertas_inmet(p_alertas jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if jsonb_typeof(p_alertas) <> 'array' then
    raise exception 'p_alertas precisa ser um array JSON';
  end if;

  delete from public.alertas_inmet;

  insert into public.alertas_inmet (
    id,
    evento,
    severidade,
    nivel,
    inicio,
    fim,
    descricao,
    areas,
    link,
    payload_bruto,
    atualizado_em
  )
  select
    item.id,
    item.evento,
    item.severidade,
    item.nivel,
    item.inicio,
    item.fim,
    item.descricao,
    item.areas,
    item.link,
    item.payload_bruto,
    now()
  from jsonb_to_recordset(p_alertas) as item(
    id text,
    evento text,
    severidade text,
    nivel smallint,
    inicio timestamptz,
    fim timestamptz,
    descricao text,
    areas text[],
    link text,
    payload_bruto jsonb
  );

  insert into public.inmet_sync_status (id, atualizado_em)
  values ('rs', now())
  on conflict (id) do update
  set atualizado_em = excluded.atualizado_em;
end;
$$;

revoke all on function public.sincronizar_alertas_inmet(jsonb) from public, anon, authenticated;
grant execute on function public.sincronizar_alertas_inmet(jsonb) to service_role;
