create table if not exists public.alertas_inmet_publicacoes (
  alerta_id text not null,
  regiao text not null,
  canal text not null,
  publicada boolean not null default false,
  reservado_ate timestamptz not null default now(),
  publicado_em timestamptz,
  primary key (alerta_id, regiao),
  check (
    (publicada and publicado_em is not null)
    or (not publicada and publicado_em is null)
  )
);

alter table public.alertas_inmet_publicacoes enable row level security;

create or replace function public.reservar_publicacao_alerta_inmet(
  p_alerta_id text,
  p_regiao text,
  p_canal text,
  p_lease_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  reservado boolean;
begin
  if p_lease_seconds < 1 or p_lease_seconds > 3600 then
    raise exception 'p_lease_seconds deve estar entre 1 e 3600';
  end if;

  insert into public.alertas_inmet_publicacoes (
    alerta_id,
    regiao,
    canal,
    reservado_ate
  )
  values (
    p_alerta_id,
    p_regiao,
    p_canal,
    now() + make_interval(secs => p_lease_seconds)
  )
  on conflict (alerta_id, regiao) do update
  set
    canal = excluded.canal,
    reservado_ate = excluded.reservado_ate
  where not public.alertas_inmet_publicacoes.publicada
    and public.alertas_inmet_publicacoes.reservado_ate < now()
  returning true into reservado;

  return coalesce(reservado, false);
end;
$$;

create or replace function public.marcar_publicacao_alerta_inmet(
  p_alerta_id text,
  p_regiao text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.alertas_inmet_publicacoes
  set publicada = true, publicado_em = now()
  where alerta_id = p_alerta_id
    and regiao = p_regiao
    and not publicada;

  if not found then
    raise exception 'A reserva da publicação do alerta não foi encontrada';
  end if;
end;
$$;

create or replace function public.liberar_reserva_publicacao_alerta_inmet(
  p_alerta_id text,
  p_regiao text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.alertas_inmet_publicacoes
  where alerta_id = p_alerta_id
    and regiao = p_regiao
    and not publicada;
$$;

revoke all on function public.reservar_publicacao_alerta_inmet(text, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.marcar_publicacao_alerta_inmet(text, text)
  from public, anon, authenticated;
revoke all on function public.liberar_reserva_publicacao_alerta_inmet(text, text)
  from public, anon, authenticated;

grant execute on function public.reservar_publicacao_alerta_inmet(text, text, text, integer)
  to service_role;
grant execute on function public.marcar_publicacao_alerta_inmet(text, text)
  to service_role;
grant execute on function public.liberar_reserva_publicacao_alerta_inmet(text, text)
  to service_role;
