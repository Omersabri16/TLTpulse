-- Supabase'in "otomatik RLS" seçeneğinin oluşturduğu event trigger fonksiyonu API'den (rpc) çağrılamasın.
-- Event trigger sahibinin yetkisiyle çalışmaya devam eder.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
