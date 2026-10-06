-- 6 Ekim 2026 kararları (kararlar.md Bölüm 5): sezonlu lig, puan defteri, proje değerlendirmesi (kopya/şablon/AI zorluk),
-- otomatik yarışma değerlendirmesi, yönetici, şikayet/engelleme, Certifier, Gemini kotası, KVKK.
-- Güvenlik modeli 0001 ile aynı: yeni tablolarda RLS açık ve politikasız; okuma/yazma sadece sunucudan (service_role).

-- ---------- Sezonlar ----------
create table if not exists public.seasons (
  id integer primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  closed_at timestamptz,
  check (ends_at > starts_at)
);
-- İlk sezon site yayına çıkınca başladı; 6 aylık sınırlar 1 Ocak ve 1 Temmuz (İstanbul saati).
insert into public.seasons (id, name, starts_at, ends_at)
values (1, 'Sezon 1', '2026-10-01T00:00:00+03:00', '2027-01-01T00:00:00+03:00')
on conflict (id) do nothing;

create or replace function private.open_season() returns integer
language sql stable set search_path = '' as $$
  select id from public.seasons where closed_at is null order by id desc limit 1;
$$;
revoke all on function private.open_season() from public;

-- ---------- Profiller ----------
alter table public.profiles
  add column if not exists league text not null default 'Yeni başlayan' check (league in ('Yeni başlayan', 'Orta', 'Kıdemli')),
  add column if not exists season_points integer not null default 0,
  add column if not exists season_points_at timestamptz,
  add column if not exists is_admin boolean not null default false,
  add column if not exists suspended boolean not null default false,
  add column if not exists kvkk_accepted_at timestamptz;
create index if not exists profiles_league_idx on public.profiles (league, season_points desc, season_points_at);
-- Örnek kullanıcıların puanı artık defterden (score_events) geliyor.
alter table public.profiles drop column if exists seed_points;

-- ---------- Puan defteri ----------
-- Her puan değişikliği bir satır. `ref`: kaynağın anahtarı (ör. project:<id>); sunucu her kaynağın beklenen puanını
-- defterdeki toplamla karşılaştırıp farkı yazar (yeniden analiz, silme, yeni akran puanı otomatik farka dönüşür).
alter table public.score_events
  add column if not exists season_id integer references public.seasons (id),
  add column if not exists ref text check (ref is null or char_length(ref) <= 200);
update public.score_events set season_id = 1 where season_id is null;
create index if not exists score_events_ref_idx on public.score_events (user_id, ref);
create index if not exists score_events_season_idx on public.score_events (season_id, user_id);

create or replace function private.score_event_season() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.season_id is null then
    new.season_id := private.open_season();
  end if;
  return new;
end $$;
revoke all on function private.score_event_season() from public;
drop trigger if exists score_events_season on public.score_events;
create trigger score_events_season before insert on public.score_events for each row execute function private.score_event_season();

-- Beklenen kalemleri (p_items: [{ref, source, label, points, sticky}]) defterle karşılaştırıp farkı yazar ve profildeki
-- toplamları günceller. Profil satırı kilitlenir: aynı anda iki istek gelse de fark bir kez yazılır.
-- Kaynağı silinen kalemin puanı geri alınır; yol haritası adımları (sticky) ve örnek veri (seed:) geri alınmaz.
create or replace function public.apply_score_items(p_user uuid, p_items jsonb) returns void
language plpgsql set search_path = '' as $$
declare it record; sid integer := private.open_season();
begin
  perform 1 from public.profiles where id = p_user for update;
  for it in
    with e as (
      select x->>'ref' as ref, x->>'source' as source, x->>'label' as label, (x->>'points')::int as points,
        coalesce((x->>'sticky')::boolean, false) as sticky
      from jsonb_array_elements(p_items) x
    ), h as (
      select ref, sum(points)::int as pts from public.score_events where user_id = p_user and ref is not null group by ref
    )
    select coalesce(e.ref, h.ref) as ref, e.source, e.label, coalesce(e.points, 0) - coalesce(h.pts, 0) as diff,
      coalesce(e.sticky, false) as sticky, h.ref is null as fresh, e.ref is null as gone
    from e full join h on h.ref = e.ref
  loop
    continue when it.diff = 0;
    continue when it.gone and (it.ref like 'roadmap:%' or it.ref like 'seed:%');
    continue when it.sticky and it.diff < 0;
    insert into public.score_events (user_id, source, label, points, ref, season_id)
    values (
      p_user,
      coalesce(it.source, case
        when it.ref like 'project:%' then 'Projeler' when it.ref like 'cert:%' then 'Sertifikalar'
        when it.ref like 'approval:%' then 'Referanslar' when it.ref like 'comp:%' then 'Yarışmalar'
        when it.ref like 'roadmap:%' then 'Yol haritası' else 'Akran puanı' end),
      left(case when it.gone then 'Kaldırılan kanıt' when it.fresh then it.label else it.label || ' (güncellendi)' end, 200),
      it.diff, it.ref, sid
    );
  end loop;

  update public.profiles p set score = s.total, season_points = s.season, season_points_at = s.at
  from (
    select coalesce(sum(points), 0)::int as total,
      coalesce(sum(points) filter (where season_id = sid), 0)::int as season,
      max(created_at) filter (where season_id = sid) as at
    from public.score_events where user_id = p_user
  ) s
  where p.id = p_user;
end $$;

create table if not exists public.season_results (
  season_id integer not null references public.seasons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  from_league text not null,
  to_league text not null,
  season_points integer not null,
  rank integer not null,
  champion boolean not null default false,
  seen boolean not null default false,
  primary key (season_id, user_id)
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('Sezon şampiyonu', 'Mentor')),
  ref text not null,
  label text not null check (char_length(label) <= 120),
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);

-- ---------- Projeler ----------
alter table public.projects
  add column if not exists status text not null default 'hazır' check (status in ('hazır', 'analiz bekliyor')),
  add column if not exists commit_sha text check (commit_sha is null or commit_sha ~ '^[0-9a-f]{40}$'),
  add column if not exists reasons jsonb not null default '[]'::jsonb,
  add column if not exists analyzed_at timestamptz;

-- Dosya içerik özetleri (GitHub blob SHA). Kopya ve şablon kontrolü için; içerik saklanmaz.
create table if not exists public.project_files (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  blob_sha text not null check (blob_sha ~ '^[0-9a-f]{40}$'),
  primary key (project_id, blob_sha)
);
create index if not exists project_files_sha_idx on public.project_files (blob_sha);

-- Aynı commit hep aynı sonucu alsın diye AI zorluk sınıflandırması commit'e göre saklanır.
create table if not exists public.project_analysis_cache (
  repo text not null check (repo ~ '^[a-z0-9-]{1,39}/[a-z0-9._-]{1,100}$'),
  commit_sha text not null check (commit_sha ~ '^[0-9a-f]{40}$'),
  difficulty text not null check (difficulty in ('Kolay', 'Orta', 'Zor')),
  reasons jsonb not null,
  model text not null default '',
  created_at timestamptz not null default now(),
  primary key (repo, commit_sha)
);

-- 3 ya da daha fazla farklı kullanıcının projesinde aynen geçen dosyalar şablon sayılır.
create or replace function public.template_shas(p_shas text[]) returns setof text
language sql stable set search_path = '' as $$
  select f.blob_sha from public.project_files f
  where f.blob_sha = any (p_shas)
  group by f.blob_sha having count(distinct f.user_id) >= 3;
$$;

-- Verilen dosyalarla en çok örtüşen tek proje (kendisi hariç).
create or replace function public.project_overlap(p_shas text[], p_exclude uuid) returns table (project_id uuid, user_id uuid, shared bigint)
language sql stable set search_path = '' as $$
  select f.project_id, min(f.user_id::text)::uuid, count(*) from public.project_files f
  where f.blob_sha = any (p_shas) and (p_exclude is null or f.project_id <> p_exclude)
  group by f.project_id order by 3 desc limit 1;
$$;

-- ---------- Yarışmalar ----------
alter table public.competitions drop constraint if exists competitions_status_check;
alter table public.competitions add constraint competitions_status_check
  check (status in ('Taslak', 'Sırada', 'Başvurular açık', 'Devam ediyor', 'Değerlendiriliyor', 'Tamamlandı', 'İptal'));
alter table public.competitions
  add column if not exists difficulty text not null default 'Orta' check (difficulty in ('Kolay', 'Orta', 'Zor')),
  add column if not exists spec_id text check (spec_id is null or spec_id ~ '^[a-z0-9-]{3,40}$'),
  add column if not exists spec jsonb not null default '{}'::jsonb,
  add column if not exists tests jsonb not null default '[]'::jsonb,
  add column if not exists tests_verified_at timestamptz,
  add column if not exists publish_on date,
  add column if not exists locked boolean not null default false,
  add column if not exists calibration text check (calibration is null or calibration in ('Fazla kolay', 'Fazla zor', 'Dengeli')),
  add column if not exists is_demo boolean not null default false,
  add column if not exists cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  add column if not exists created_at timestamptz not null default now();

alter table public.applications
  add column if not exists status text not null default 'Başvurdu' check (status in ('Başvurdu', 'Takımda', 'Yedek'));

alter table public.teams
  add column if not exists demo_url text check (demo_url is null or char_length(demo_url) <= 300),
  add column if not exists frozen_sha text check (frozen_sha is null or frozen_sha ~ '^[0-9a-f]{40}$'),
  add column if not exists signals jsonb not null default '{}'::jsonb,
  add column if not exists public_run jsonb,
  add column if not exists public_run_at timestamptz,
  add column if not exists created_at timestamptz not null default now();
-- Sıralama ve jüri kalktı (6 Ekim 2026).
alter table public.teams drop column if exists rank, drop column if exists jury_score;
alter table public.teams drop constraint if exists teams_repo_url_check;
alter table public.teams add constraint teams_repo_url_check check (repo_url is null or repo_url ~ '^https://github\.com/[A-Za-z0-9-]+/[A-Za-z0-9._-]+$');

alter table public.team_members
  add column if not exists points integer not null default 0,
  add column if not exists commits integer;

-- Silinen kullanıcının takım mesajları "Silinmiş kullanıcı" olarak kalır.
alter table public.team_messages alter column user_id drop not null;
alter table public.team_messages drop constraint if exists team_messages_user_id_fkey;
alter table public.team_messages add constraint team_messages_user_id_fkey foreign key (user_id) references public.profiles (id) on delete set null;

create table if not exists public.competition_results (
  team_id text primary key references public.teams (id) on delete cascade,
  competition_id text not null references public.competitions (id) on delete cascade,
  hidden_passed integer not null default 0,
  hidden_total integer not null default 0,
  tests jsonb not null default '[]'::jsonb,
  correctness real not null default 0,
  quality real not null default 0,
  teamwork real not null default 0,
  coverage real not null default 0,
  points integer not null default 0,
  eliminated text check (eliminated is null or char_length(eliminated) <= 300),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists competition_results_comp_idx on public.competition_results (competition_id);

-- Değerlendirme istekleri: sonuç geri yazılırken nonce bir kez kullanılır (tekrar gönderime karşı).
create table if not exists public.evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  competition_id text not null references public.competitions (id) on delete cascade,
  kind text not null check (kind in ('degerlendirme', 'acik', 'dogrulama')),
  team_id text references public.teams (id) on delete cascade,
  nonce_hash text not null unique,
  status text not null default 'Bekliyor' check (status in ('Bekliyor', 'Tamam', 'Hata')),
  requested_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists evaluation_runs_comp_idx on public.evaluation_runs (competition_id, requested_at desc);

-- ---------- Şikayet ve engelleme ----------
create table if not exists public.blocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id),
  check (user_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_user uuid references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('Profil', 'Mesaj', 'Proje')),
  target_id text not null check (char_length(target_id) <= 100),
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'Açık' check (status in ('Açık', 'Kapatıldı')),
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ---------- Certifier sertifikaları ----------
create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('Yarışma', 'Sezon şampiyonu')),
  ref text not null,
  title text not null check (char_length(title) <= 200),
  status text not null default 'Beklemede' check (status in ('Beklemede', 'Gönderildi')),
  url text check (url is null or url ~ '^https://'),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);

-- ---------- Hız sınırı: e-posta / IP anahtarıyla (giriş yapmamış kullanıcı) ----------
alter table public.rate_events alter column user_id drop not null;
alter table public.rate_events add column if not exists key text check (key is null or char_length(key) <= 100);
alter table public.rate_events drop constraint if exists rate_events_owner_check;
alter table public.rate_events add constraint rate_events_owner_check check (user_id is not null or key is not null);
create index if not exists rate_events_key_idx on public.rate_events (key, action, created_at desc);

-- ---------- Gemini günlük kota sayacı (ücretsiz katman bütün özelliklerde ortak) ----------
create table if not exists public.gemini_usage (
  day date not null,
  kind text not null check (char_length(kind) <= 30),
  count integer not null default 0,
  primary key (day, kind)
);

-- Bugünkü toplam p_limit'in altındaysa sayacı artırıp true döner. Tek ifadeyle (yarış durumunda da doğru).
create or replace function public.gemini_take(p_kind text, p_limit integer) returns boolean
language plpgsql set search_path = '' as $$
declare today date := (now() at time zone 'Europe/Istanbul')::date; total integer;
begin
  perform pg_advisory_xact_lock(hashtext('gemini_usage'));
  select coalesce(sum(count), 0) into total from public.gemini_usage where day = today;
  if total >= p_limit then return false; end if;
  insert into public.gemini_usage (day, kind, count) values (today, p_kind, 1)
  on conflict (day, kind) do update set count = public.gemini_usage.count + 1;
  return true;
end $$;

-- Sezon sonu kararları (yazmadan): kim hangi lige gidiyor. Kapanış ve yönetici önizlemesi aynı kuralı kullanır.
create or replace function public.season_moves() returns table (user_id uuid, from_league text, to_league text, season_points integer, rank bigint, champion boolean)
language sql stable set search_path = '' as $$
  select r.id, r.league,
    case
      when r.rk <= 20 and r.season_points >= 100 and r.league = 'Yeni başlayan' then 'Orta'
      when r.rk <= 20 and r.season_points >= 100 and r.league = 'Orta' then 'Kıdemli'
      when r.league in ('Orta', 'Kıdemli') and r.rk > r.n - 20 and r.season_points < 100
        then case r.league when 'Orta' then 'Yeni başlayan' else 'Orta' end
      else r.league
    end,
    r.season_points, r.rk, (r.league = 'Kıdemli' and r.rk <= 20 and r.season_points >= 100)
  from (
    select p.id, p.league, p.season_points,
      row_number() over (partition by p.league order by p.season_points desc, p.season_points_at asc nulls last, p.created_at) as rk,
      count(*) over (partition by p.league) as n
    from public.profiles p where not p.suspended
  ) r;
$$;

-- ---------- Sezon kapanışı (tek işlem) ----------
-- Her ligin ilk 20'si (100+ puanla) bir üst lige; Orta ve Kıdemli'nin son 20'si (100'ün altında) bir alt lige.
-- Aynı kişi iki listedeyse yükselme geçerli. Kıdemli'nin ilk 20'si (100+) "Sezon şampiyonu". Yeni sezon açılır.
create or replace function public.close_season(p_season integer) returns jsonb
language plpgsql set search_path = '' as $$
declare
  s public.seasons;
  local_now timestamp := now() at time zone 'Europe/Istanbul';
  next_end timestamptz;
  res jsonb;
begin
  select * into s from public.seasons where id = p_season for update;
  if s.id is null or s.closed_at is not null then raise exception 'sezon bulunamadı ya da kapalı'; end if;

  insert into public.season_results (season_id, user_id, from_league, to_league, season_points, rank, champion)
  select p_season, m.user_id, m.from_league, m.to_league, m.season_points, m.rank, m.champion from public.season_moves() m;

  update public.profiles p set league = r.to_league
  from public.season_results r
  where r.season_id = p_season and r.user_id = p.id and r.to_league <> r.from_league;

  insert into public.badges (user_id, kind, ref, label)
  select user_id, 'Sezon şampiyonu', 'sezon-' || p_season, s.name || ' şampiyonu'
  from public.season_results where season_id = p_season and champion
  on conflict do nothing;

  insert into public.notifications (user_id, text, href)
  select user_id,
    case
      when champion then s.name || ' bitti. Kıdemli ligin ilk 20''sindesin: Sezon şampiyonu!'
      when to_league <> from_league and (case to_league when 'Kıdemli' then 3 when 'Orta' then 2 else 1 end) > (case from_league when 'Kıdemli' then 3 when 'Orta' then 2 else 1 end)
        then s.name || ' bitti. ' || to_league || ' lige yükseldin!'
      else s.name || ' bitti. ' || to_league || ' lige düştün; yeni sezonda tekrar yükselebilirsin.'
    end,
    '/lig'
  from public.season_results where season_id = p_season and (to_league <> from_league or champion);

  update public.profiles set season_points = 0, season_points_at = null where season_points <> 0 or season_points_at is not null;
  update public.seasons set closed_at = now() where id = p_season;

  -- Yeni sezon: şimdiden bir sonraki 1 Ocak / 1 Temmuz'a kadar.
  next_end := (case when extract(month from local_now) < 7
    then make_timestamp(extract(year from local_now)::int, 7, 1, 0, 0, 0)
    else make_timestamp(extract(year from local_now)::int + 1, 1, 1, 0, 0, 0) end) at time zone 'Europe/Istanbul';
  insert into public.seasons (id, name, starts_at, ends_at) values (p_season + 1, 'Sezon ' || (p_season + 1), now(), next_end);

  select jsonb_build_object(
    'promoted', count(*) filter (where (from_league = 'Yeni başlayan' and to_league = 'Orta') or (from_league = 'Orta' and to_league = 'Kıdemli')),
    'relegated', count(*) filter (where (from_league = 'Kıdemli' and to_league = 'Orta') or (from_league = 'Orta' and to_league = 'Yeni başlayan')),
    'champions', count(*) filter (where champion),
    'next_season', p_season + 1
  ) into res from public.season_results where season_id = p_season;
  return res;
end $$;

-- ---------- Yetkiler ----------
do $$
declare t text;
begin
  foreach t in array array['seasons','season_results','badges','project_files','project_analysis_cache','competition_results',
    'evaluation_runs','blocks','reports','credentials','gemini_usage']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

-- RPC fonksiyonları sadece sunucudan (secret key) çağrılabilir.
revoke all on function public.template_shas(text[]) from public, anon, authenticated;
revoke all on function public.project_overlap(text[], uuid) from public, anon, authenticated;
revoke all on function public.gemini_take(text, integer) from public, anon, authenticated;
revoke all on function public.close_season(integer) from public, anon, authenticated;
revoke all on function public.season_moves() from public, anon, authenticated;
revoke all on function public.apply_score_items(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.template_shas(text[]) to service_role;
grant execute on function public.project_overlap(text[], uuid) to service_role;
grant execute on function public.gemini_take(text, integer) to service_role;
grant execute on function public.close_season(integer) to service_role;
grant execute on function public.season_moves() to service_role;
grant execute on function public.apply_score_items(uuid, jsonb) to service_role;
grant execute on function private.open_season() to service_role;
grant usage on schema private to service_role;
