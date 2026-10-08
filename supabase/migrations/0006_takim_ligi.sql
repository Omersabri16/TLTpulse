-- Mentor puanı (kararlar.md Bölüm 5, 9 Ekim 2026): "takımdaki Yeni başlayan" ve "Orta / Kıdemli mentor" yarışma
-- anındaki lige göre belirlenir. Önceden puan her hesaplandığında o anki lige bakılıyordu: puanlayan sonradan yükselirse
-- ya da mentor düşerse kazanılmış mentor puanı siliniyordu. Artık üyenin ligi takıma girdiği an saklanıyor.

alter table public.team_members
  add column if not exists league text check (league is null or league in ('Yeni başlayan', 'Orta', 'Kıdemli'));

-- Her ekleme yolunda (takım kurma, yedekten alma, yönetici taşıması, seed) lig kendiliğinden yazılır.
create or replace function public.team_member_league() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.league is null then
    select p.league into new.league from public.profiles p where p.id = new.user_id;
  end if;
  return new;
end $$;
revoke all on function public.team_member_league() from public, anon, authenticated;

drop trigger if exists team_members_league on public.team_members;
create trigger team_members_league before insert on public.team_members
  for each row execute function public.team_member_league();

-- Eski kayıtlar: yarışmanın başladığı sezon kapanmışsa o sezondaki lig (season_results.from_league), yoksa bugünkü lig.
update public.team_members tm
  set league = coalesce(
    (select sr.from_league
       from public.competitions c
       join public.seasons s on c.start_date >= (s.starts_at at time zone 'Europe/Istanbul')::date
                            and c.start_date < (s.ends_at at time zone 'Europe/Istanbul')::date
       join public.season_results sr on sr.season_id = s.id and sr.user_id = tm.user_id
      where c.id = tm.competition_id
      limit 1),
    p.league)
  from public.profiles p
  where p.id = tm.user_id and tm.league is null;
