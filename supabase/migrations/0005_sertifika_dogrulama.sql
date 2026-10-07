-- Sertifika doğrulama (kararlar.md Bölüm 5 ve 6, 7 Ekim 2026):
-- BTK Akademi ve Credly kaynaktan doğrulanır (20 puan); diğerleri "Beyan" (5), bir kişi onaylarsa "Onaylandı" (20).
-- "Doğrulanamadı" eski kod için geçerli kalıyor (canlıdaki eski sürüm yeni koda geçene kadar bunu yazıyor).

alter table public.certificates drop constraint if exists certificates_status_check;
alter table public.certificates add constraint certificates_status_check
  check (status in ('Doğrulandı', 'İsim uyuşmuyor', 'Beyan', 'Onaylandı', 'Doğrulanamadı'));

-- Aynı sertifika iki hesapta puan almasın: BTK / Credly numarası ya da sadeleştirilmiş link.
-- Sadece doğrulanmış ya da onaylanmış kayıt kilitler (isim tutmayan 0 puanlık kayıt gerçek sahibini engellemez).
alter table public.certificates add column if not exists cert_key text check (cert_key is null or char_length(cert_key) <= 320);
create index if not exists certificates_key_idx on public.certificates (cert_key);
create unique index if not exists certificates_key_owned_uniq on public.certificates (cert_key) where status in ('Doğrulandı', 'Onaylandı');

-- Eski kurallar: Coursera / Udemy sadece alan adına bakılarak "Doğrulandı" sayılıyordu; artık beyan.
update public.certificates set status = 'Beyan', points = 5
  where provider in ('Coursera', 'Udemy', 'Diğer') and status in ('Doğrulandı', 'Doğrulanamadı');
update public.certificates set status = 'Beyan', points = 5 where status = 'Doğrulanamadı';
-- Credly 25 → 20.
update public.certificates set points = 20 where provider = 'Credly' and status = 'Doğrulandı';

-- Beyan edilen sertifikaya kişi onayı.
alter table public.approvals drop constraint if exists approvals_target_type_check;
alter table public.approvals add constraint approvals_target_type_check check (target_type in ('experience', 'project', 'certificate'));
