-- ═══════════════════════════════════════════════════════════════════
-- Perfil profissional (personal / nutricionista) do DayForge
-- Rode UMA vez no Supabase: Dashboard → SQL Editor → cole tudo → Run.
-- Pode rodar de novo sem problema (é idempotente).
--
-- O que faz:
--   • perfil.tipo_conta ('aluno' | 'profissional') e perfil.codigo_profissional
--   • tabela vinculos_profissional (aluno pede com o código, profissional aceita)
--   • regras de acesso EXTRAS: o profissional enxerga/edita dados SÓ dos alunos
--     com vínculo ATIVO. As regras atuais de cada usuário continuam iguais.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Perfil: tipo de conta e código do profissional
alter table public.perfil
  add column if not exists tipo_conta text not null default 'aluno';
alter table public.perfil
  add column if not exists codigo_profissional text;

do $$ begin
  alter table public.perfil
    add constraint perfil_tipo_conta_check check (tipo_conta in ('aluno', 'profissional'));
exception when duplicate_object then null; end $$;

create unique index if not exists perfil_codigo_profissional_key
  on public.perfil (codigo_profissional) where codigo_profissional is not null;

-- 2) Vínculos aluno ↔ profissional
create table if not exists public.vinculos_profissional (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references auth.users (id) on delete cascade,
  aluno_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'ativo')),
  created_at timestamptz not null default now(),
  unique (profissional_id, aluno_id),
  check (profissional_id <> aluno_id)
);

alter table public.vinculos_profissional enable row level security;

drop policy if exists "vinculo: participantes veem" on public.vinculos_profissional;
create policy "vinculo: participantes veem" on public.vinculos_profissional
  for select using (auth.uid() in (profissional_id, aluno_id));

-- aluno pede o vínculo (sempre começa pendente)
drop policy if exists "vinculo: aluno pede" on public.vinculos_profissional;
create policy "vinculo: aluno pede" on public.vinculos_profissional
  for insert with check (aluno_id = auth.uid() and status = 'pendente');

-- só o profissional aceita
drop policy if exists "vinculo: profissional aceita" on public.vinculos_profissional;
create policy "vinculo: profissional aceita" on public.vinculos_profissional
  for update using (profissional_id = auth.uid())
  with check (profissional_id = auth.uid());

-- qualquer um dos dois desfaz
drop policy if exists "vinculo: participantes desfazem" on public.vinculos_profissional;
create policy "vinculo: participantes desfazem" on public.vinculos_profissional
  for delete using (auth.uid() in (profissional_id, aluno_id));

-- 3) Funções auxiliares (security definer: rodam com permissão do dono,
--    mas só devolvem o que diz respeito a quem chamou)

-- O usuário logado é profissional ATIVO desse aluno?
create or replace function public.eh_profissional_de(aluno uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.vinculos_profissional v
    where v.profissional_id = auth.uid()
      and v.aluno_id = aluno
      and v.status = 'ativo'
  );
$$;

-- Aluno procura o profissional pelo código (só devolve id e nome)
create or replace function public.buscar_profissional(codigo text)
returns table (id uuid, nome text)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.nome
  from public.perfil p
  where p.codigo_profissional = upper(trim(codigo))
    and p.tipo_conta = 'profissional';
$$;

-- Vínculos de quem está logado, com o nome da outra pessoa
create or replace function public.meus_vinculos()
returns table (id uuid, papel text, outro_id uuid, outro_nome text, status text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select v.id,
         case when v.profissional_id = auth.uid() then 'profissional' else 'aluno' end,
         case when v.profissional_id = auth.uid() then v.aluno_id else v.profissional_id end,
         p.nome,
         v.status,
         v.created_at
  from public.vinculos_profissional v
  left join public.perfil p
    on p.user_id = case when v.profissional_id = auth.uid() then v.aluno_id else v.profissional_id end
  where auth.uid() in (v.profissional_id, v.aluno_id)
  order by v.created_at desc;
$$;

grant execute on function public.eh_profissional_de(uuid) to authenticated;
grant execute on function public.buscar_profissional(text) to authenticated;
grant execute on function public.meus_vinculos() to authenticated;

-- 4) Regras extras nas tabelas do aluno
do $$
declare
  t text;
  -- o profissional só VÊ
  leitura text[] := array[
    'perfil', 'macros_registro', 'macros_meta', 'agua_registro', 'agua_meta',
    'peso_registro', 'medidas_registro', 'treinos_finalizados'
  ];
  -- o profissional VÊ e EDITA
  edicao text[] := array['exercicio', 'dieta_plano'];
begin
  foreach t in array leitura || edicao loop
    if to_regclass('public.' || t) is null then
      raise notice 'tabela % não existe, pulando', t;
      continue;
    end if;
    execute format('drop policy if exists "profissional: ver aluno" on public.%I', t);
    execute format(
      'create policy "profissional: ver aluno" on public.%I for select using (public.eh_profissional_de(user_id))', t);
  end loop;

  foreach t in array edicao loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop policy if exists "profissional: criar no aluno" on public.%I', t);
    execute format(
      'create policy "profissional: criar no aluno" on public.%I for insert with check (public.eh_profissional_de(user_id))', t);
    execute format('drop policy if exists "profissional: editar aluno" on public.%I', t);
    execute format(
      'create policy "profissional: editar aluno" on public.%I for update using (public.eh_profissional_de(user_id)) with check (public.eh_profissional_de(user_id))', t);
    execute format('drop policy if exists "profissional: apagar no aluno" on public.%I', t);
    execute format(
      'create policy "profissional: apagar no aluno" on public.%I for delete using (public.eh_profissional_de(user_id))', t);
  end loop;
end $$;
