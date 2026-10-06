-- 0004 (6 Ekim 2026 akşam): yeni alanlar, bağlantı istekleri, yüzdelik lig kuralı. Yeniden çalıştırılabilir.

-- ---------- Alanlar ----------
-- "Mobil" üç alana ayrıldı (iOS, Android, Cross-Platform); eski "Mobil" kayıtlar Cross-Platform oldu.
-- Liste src/lib/types.ts FIELDS ile aynı olmalı.
alter table public.profiles drop constraint if exists profiles_field_check;
alter table public.applications drop constraint if exists applications_field_check;
alter table public.roadmaps drop constraint if exists roadmaps_target_check;

update public.profiles set field = 'Cross-Platform' where field = 'Mobil';
update public.applications set field = 'Cross-Platform' where field = 'Mobil';
update public.roadmaps set target = 'Cross-Platform' where target = 'Mobil';
update public.team_members set field = 'Cross-Platform' where field = 'Mobil';

alter table public.profiles add constraint profiles_field_check check (field in ('',
  'Frontend', 'Backend', 'Full Stack', 'Veritabanı', 'iOS', 'Android', 'Cross-Platform', 'Veri Bilimi', 'Yapay Zeka',
  'Siber Güvenlik', 'Bulut Bilişim', 'DevOps', 'Oyun Geliştirme', 'Gömülü / IoT', 'Test / QA'));
alter table public.applications add constraint applications_field_check check (field in (
  'Frontend', 'Backend', 'Full Stack', 'Veritabanı', 'iOS', 'Android', 'Cross-Platform', 'Veri Bilimi', 'Yapay Zeka',
  'Siber Güvenlik', 'Bulut Bilişim', 'DevOps', 'Oyun Geliştirme', 'Gömülü / IoT', 'Test / QA'));
alter table public.roadmaps add constraint roadmaps_target_check check (target in (
  'Frontend', 'Backend', 'Full Stack', 'Veritabanı', 'iOS', 'Android', 'Cross-Platform', 'Veri Bilimi', 'Yapay Zeka',
  'Siber Güvenlik', 'Bulut Bilişim', 'DevOps', 'Oyun Geliştirme', 'Gömülü / IoT', 'Test / QA'));

-- ---------- Bağlantı istekleri ----------
-- Bağlantı artık iki taraflı onayla kuruluyor: istek burada bekler, kabul edilince connections'a iki satır yazılır ve istek silinir.
create table if not exists public.connection_requests (
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
create index if not exists connection_requests_to_idx on public.connection_requests (to_id);
alter table public.connection_requests enable row level security;
revoke all on table public.connection_requests from anon, authenticated;
grant all on table public.connection_requests to service_role;

-- ---------- Yüzdelik lig kuralı ----------
-- Her ligin ilk %20'si (yukarı yuvarlanır, en az 100 puanla) yükselir; Orta ve Kıdemli'nin son %10'u (aşağı yuvarlanır,
-- 100'ün altındaysa) düşer. Aynı kişi iki listedeyse yükselme geçerli. Kıdemli'nin ilk %20'si (100+) sezon şampiyonu.
-- src/lib/score.ts promotionCount / relegationCount ile aynı.
create or replace function public.season_moves() returns table (user_id uuid, from_league text, to_league text, season_points integer, rank bigint, champion boolean)
language sql stable set search_path = '' as $$
  select r.id, r.league,
    case
      when r.rk <= ceil(r.n * 0.2) and r.season_points >= 100 and r.league = 'Yeni başlayan' then 'Orta'
      when r.rk <= ceil(r.n * 0.2) and r.season_points >= 100 and r.league = 'Orta' then 'Kıdemli'
      when r.league in ('Orta', 'Kıdemli') and r.rk > r.n - floor(r.n * 0.1) and r.season_points < 100
        then case r.league when 'Orta' then 'Yeni başlayan' else 'Orta' end
      else r.league
    end,
    r.season_points, r.rk, (r.league = 'Kıdemli' and r.rk <= ceil(r.n * 0.2) and r.season_points >= 100)
  from (
    select p.id, p.league, p.season_points,
      row_number() over (partition by p.league order by p.season_points desc, p.season_points_at asc nulls last, p.created_at) as rk,
      count(*) over (partition by p.league) as n
    from public.profiles p where not p.suspended
  ) r;
$$;
revoke all on function public.season_moves() from public, anon, authenticated;
grant execute on function public.season_moves() to service_role;

-- Bildirim metni "ilk 20" diyordu.
create or replace function private.season_note(p_name text, p_champion boolean, p_from text, p_to text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_champion then p_name || ' bitti. Kıdemli ligin ilk %20''sindesin: Sezon şampiyonu!'
    when (case p_to when 'Kıdemli' then 3 when 'Orta' then 2 else 1 end) > (case p_from when 'Kıdemli' then 3 when 'Orta' then 2 else 1 end)
      then p_name || ' bitti. ' || p_to || ' lige yükseldin! Başarını profilinden paylaşabilirsin.'
    else p_name || ' bitti. ' || p_to || ' lige düştün; yeni sezonda tekrar yükselebilirsin.'
  end;
$$;

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
  select user_id, private.season_note(s.name, champion, from_league, to_league), case when champion or to_league <> from_league and from_league <> 'Kıdemli' and to_league <> 'Yeni başlayan' then '/profil?paylas=1' else '/lig' end
  from public.season_results where season_id = p_season and (to_league <> from_league or champion);

  update public.profiles set season_points = 0, season_points_at = null where season_points <> 0 or season_points_at is not null;
  update public.seasons set closed_at = now() where id = p_season;

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
revoke all on function public.close_season(integer) from public, anon, authenticated;
grant execute on function public.close_season(integer) to service_role;
revoke all on function private.season_note(text, boolean, text, text) from public, anon, authenticated;
grant execute on function private.season_note(text, boolean, text, text) to service_role;
