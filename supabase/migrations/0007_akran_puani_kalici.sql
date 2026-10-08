-- Akran puanı (kararlar.md Bölüm 5, 9 Ekim 2026):
-- 1) Puanlayan hesabını silse de verdiği yıldızlar kalır: from_user boşalır (anonim), yıldız ve not durur.
-- 2) Puanlayanın yarışmadaki ligi yıldızın üstünde saklanır; hesap silinince team_members satırı gitse de mentor
--    kararı (Yeni başlayanlardan 4+ yıldız) değişmez.

alter table public.peer_ratings alter column from_user drop not null;
alter table public.peer_ratings drop constraint if exists peer_ratings_from_user_fkey;
alter table public.peer_ratings
  add constraint peer_ratings_from_user_fkey foreign key (from_user) references public.profiles (id) on delete set null;

alter table public.peer_ratings
  add column if not exists from_league text check (from_league is null or from_league in ('Yeni başlayan', 'Orta', 'Kıdemli'));

create or replace function public.peer_rating_league() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.from_league is null and new.from_user is not null then
    select coalesce(tm.league, p.league) into new.from_league
      from public.profiles p
      left join public.team_members tm on tm.user_id = p.id and tm.competition_id = new.competition_id
     where p.id = new.from_user;
  end if;
  return new;
end $$;
revoke all on function public.peer_rating_league() from public, anon, authenticated;

drop trigger if exists peer_ratings_league on public.peer_ratings;
create trigger peer_ratings_league before insert on public.peer_ratings
  for each row execute function public.peer_rating_league();

-- Eski yıldızlar: puanlayanın o yarışmadaki ligi (0006'da yazıldı), yoksa bugünkü ligi.
update public.peer_ratings pr
  set from_league = coalesce(
    (select tm.league from public.team_members tm where tm.user_id = pr.from_user and tm.competition_id = pr.competition_id),
    (select p.league from public.profiles p where p.id = pr.from_user))
  where pr.from_league is null and pr.from_user is not null;
