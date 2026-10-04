-- TLTpulse şeması. Güvenlik modeli (.claude/skills/guvenlik):
-- * Tarayıcı tablolara doğrudan yazamaz. Bütün okuma/yazma Next.js sunucusundan, kullanıcı doğrulandıktan sonra
--   secret key ile yapılır. RLS her tabloda açık ve politikasız (= anon/authenticated için kapalı).
-- * Tek istisna Realtime: messages, team_messages, notifications için sadece SELECT politikası var
--   (katılımcı / takım üyesi / sahibi), tarayıcı yeni satırları canlı alabilsin diye.
-- * Puan, analiz, doğrulama durumu ve sıralama kolonlarını sadece sunucu yazar.

create schema if not exists private;

-- ---------- Profiller ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_-]{3,30}$'),
  name text not null check (char_length(name) between 2 and 80),
  headline text not null default '' check (char_length(headline) <= 120),
  field text not null default '' check (field in ('', 'Frontend', 'Backend', 'Veritabanı', 'Mobil', 'DevOps')),
  school text not null default '' check (char_length(school) <= 120),
  department text not null default '' check (char_length(department) <= 120),
  city text not null default '' check (char_length(city) <= 60),
  github text not null default '' check (github ~ '^[A-Za-z0-9-]{0,39}$'),
  github_verified boolean not null default false,
  github_code text not null default '',
  about text not null default '' check (char_length(about) <= 1000),
  interests text[] not null default '{}',
  skills jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  cv_code text not null unique,
  score integer not null default 0,
  seed_points integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists profiles_score_idx on public.profiles (score desc);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('Staj', 'İş', 'Gönüllü')),
  title text not null check (char_length(title) between 2 and 100),
  org text not null check (char_length(org) between 2 and 100),
  start_label text not null default '' check (char_length(start_label) <= 30),
  end_label text not null default '' check (char_length(end_label) <= 30),
  description text check (char_length(description) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists experiences_user_idx on public.experiences (user_id);

create table if not exists public.connections (
  user_id uuid not null references public.profiles (id) on delete cascade,
  other_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, other_id),
  check (user_id <> other_id)
);

-- ---------- Kanıtlar ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  repo_owner text not null check (repo_owner ~ '^[A-Za-z0-9-]{1,39}$'),
  repo_name text not null check (repo_name ~ '^[A-Za-z0-9._-]{1,100}$'),
  description text not null check (char_length(description) <= 500),
  techs text[] not null default '{}',
  role text not null check (role in ('Tek başıma', 'Takımla')),
  language text not null default '',
  demo_url text check (demo_url is null or (demo_url ~* '^https?://' and char_length(demo_url) <= 300)),
  analysis jsonb not null,
  points integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists projects_repo_uniq on public.projects (user_id, lower(repo_owner), lower(repo_name));

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  provider text not null check (provider in ('BTK Akademi', 'Credly', 'Coursera', 'Udemy', 'Diğer')),
  link text not null check (link ~* '^https?://' and char_length(link) <= 300),
  issued_on date not null default current_date,
  status text not null check (status in ('Doğrulandı', 'İsim uyuşmuyor', 'Doğrulanamadı')),
  points integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists certificates_user_idx on public.certificates (user_id);

-- Amir / hoca onayı. "references" SQL'de ayrılmış kelime olduğu için adı approvals.
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('experience', 'project')),
  target_id uuid not null,
  target_label text not null check (char_length(target_label) <= 200),
  approver_name text not null check (char_length(approver_name) between 2 and 80),
  approver_email text not null check (char_length(approver_email) <= 254),
  relation text not null check (relation in ('Staj amiri', 'Hoca', 'İşveren', 'Takım arkadaşı')),
  status text not null default 'Bekliyor' check (status in ('Bekliyor', 'Onaylandı', 'Reddedildi')),
  comment text check (char_length(comment) <= 500),
  token_hash text not null unique,
  expires_at timestamptz not null,
  requested_at timestamptz not null default now(),
  answered_at timestamptz,
  points integer not null default 0
);
create index if not exists approvals_user_idx on public.approvals (user_id);

-- ---------- Yarışmalar ----------
create table if not exists public.competitions (
  id text primary key check (id ~ '^y-[0-9]{2,4}$'),
  code text not null,
  title text not null,
  tagline text not null default '',
  theme text not null default '',
  status text not null check (status in ('Başvurular açık', 'Devam ediyor', 'Tamamlandı')),
  description text not null default '',
  brief text[] not null default '{}',
  deliverables text[] not null default '{}',
  positions jsonb not null default '[]'::jsonb,
  apply_deadline date not null,
  start_date date not null,
  end_date date not null
);

create table if not exists public.applications (
  competition_id text not null references public.competitions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  field text not null check (field in ('Frontend', 'Backend', 'Veritabanı', 'Mobil', 'DevOps')),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  primary key (competition_id, user_id)
);

create table if not exists public.teams (
  id text primary key default ('t-' || substr(md5(random()::text), 1, 10)),
  competition_id text not null references public.competitions (id) on delete cascade,
  name text not null,
  repo_url text check (repo_url is null or repo_url ~ '^https://github\.com/[A-Za-z0-9-]+/[A-Za-z0-9._-]+$'),
  submitted_at timestamptz,
  rank integer,
  jury_score integer
);
create index if not exists teams_competition_idx on public.teams (competition_id);

create table if not exists public.team_members (
  team_id text not null references public.teams (id) on delete cascade,
  competition_id text not null references public.competitions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  field text not null,
  primary key (team_id, user_id),
  unique (competition_id, user_id)
);
create index if not exists team_members_user_idx on public.team_members (user_id);

create table if not exists public.team_messages (
  id bigint generated always as identity primary key,
  team_id text not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists team_messages_team_idx on public.team_messages (team_id, created_at);

create table if not exists public.peer_ratings (
  id uuid primary key default gen_random_uuid(),
  competition_id text not null references public.competitions (id) on delete cascade,
  team_id text not null references public.teams (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (competition_id, from_user, to_user),
  check (from_user <> to_user)
);
create index if not exists peer_ratings_to_idx on public.peer_ratings (to_user);

-- ---------- Mesajlar ve bildirimler ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(text) <= 300),
  href text not null check (href ~ '^/[^/\\]'),
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------- Puan, yol haritası, hız sınırı ----------
create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source text not null check (source in ('Projeler', 'Yarışmalar', 'Akran puanı', 'Sertifikalar', 'Referanslar', 'Yol haritası')),
  label text not null check (char_length(label) <= 200),
  points integer not null,
  created_at timestamptz not null default now()
);
create index if not exists score_events_user_idx on public.score_events (user_id, created_at desc);

create table if not exists public.roadmaps (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  target text not null check (target in ('Frontend', 'Backend', 'Veritabanı', 'Mobil', 'DevOps')),
  summary text not null check (char_length(summary) <= 600),
  steps jsonb not null,
  baseline jsonb not null,
  source text not null check (source in ('ai', 'kural')),
  generated_at timestamptz not null default now()
);

create table if not exists public.rate_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_events_idx on public.rate_events (user_id, action, created_at desc);

-- ---------- Yetkiler ----------
-- Hepsinde RLS açık (otomatik RLS de açıyor, burada açıkça tekrar).
do $$
declare t text;
begin
  foreach t in array array['profiles','experiences','connections','projects','certificates','approvals','competitions',
    'applications','teams','team_members','team_messages','peer_ratings','conversations','messages','notifications',
    'score_events','roadmaps','rate_events']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;
grant usage on schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Realtime için tarayıcının okuyabildiği tek satırlar. Yardımcı fonksiyonlar API'ye açık olmayan private şemada.
create or replace function private.is_conversation_member(cid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversations c where c.id = cid and (select auth.uid()) in (c.user_a, c.user_b));
$$;
create or replace function private.is_team_member(tid text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members m where m.team_id = tid and m.user_id = (select auth.uid()));
$$;
revoke all on function private.is_conversation_member(uuid) from public;
revoke all on function private.is_team_member(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_conversation_member(uuid) to authenticated;
grant execute on function private.is_team_member(text) to authenticated;

grant select on table public.messages, public.team_messages, public.notifications to authenticated;

drop policy if exists "katilimci okur" on public.messages;
create policy "katilimci okur" on public.messages for select to authenticated using (private.is_conversation_member(conversation_id));
drop policy if exists "takim uyesi okur" on public.team_messages;
create policy "takim uyesi okur" on public.team_messages for select to authenticated using (private.is_team_member(team_id));
drop policy if exists "sahibi okur" on public.notifications;
create policy "sahibi okur" on public.notifications for select to authenticated using (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['messages','team_messages','notifications'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
