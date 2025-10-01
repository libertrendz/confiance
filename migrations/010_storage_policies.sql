-- 010_storage_policies.sql
-- Helpers
create or replace function public.empresa_do_usuario()
returns uuid language sql stable as $$
  select empresa_id from public.profiles where user_id=auth.uid() limit 1
$$;

-- Policies de Storage (em storage.objects)
-- Certifique-se que o bucket 'pontos-fotos' foi criado como PRIVATE
-- Habilitar RLS nas objects (já é por padrão)
-- Leitura: apenas objetos do bucket 'pontos-fotos' com prefixo da empresa do usuário
create policy if not exists "read-pontos-fotos-empresa"
on storage.objects for select
using (
  bucket_id = 'pontos-fotos'
  and auth.role() = 'authenticated'
  and position(empresa_do_usuario()::text || '/' in name) = 1
);

-- Escrita: apenas dentro do prefixo de sua empresa
create policy if not exists "write-pontos-fotos-empresa"
on storage.objects for insert
with check (
  bucket_id = 'pontos-fotos'
  and auth.role() = 'authenticated'
  and position(empresa_do_usuario()::text || '/' in name) = 1
);

-- Update/Delete apenas por admins/gestores da empresa (opcional)
create policy if not exists "update-pontos-fotos-admin"
on storage.objects for update
using (
  bucket_id = 'pontos-fotos'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.empresa_id::text = split_part(name,'/',1)
      and p.papel in ('admin','gestor')
  )
)
with check (
  bucket_id = 'pontos-fotos'
);

create policy if not exists "delete-pontos-fotos-admin"
on storage.objects for delete
using (
  bucket_id = 'pontos-fotos'
  and auth.role() = 'authenticated'
  and exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.empresa_id::text = split_part(name,'/',1)
      and p.papel in ('admin','gestor')
  )
);
