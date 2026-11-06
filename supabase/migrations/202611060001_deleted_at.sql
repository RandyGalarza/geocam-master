-- Ejecutar en Supabase para actualizar proyectos que ya tenían public.photos.
alter table public.photos
  add column if not exists deleted_at timestamptz;
