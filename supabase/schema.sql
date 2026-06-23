-- Special Cutz Portfolio — Supabase setup
-- Run this in Supabase Dashboard → SQL Editor

-- Categories used in the portfolio
-- video-production | social-media | video-editing | content-strategy

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (
    category in (
      'video-production',
      'social-media',
      'video-editing',
      'content-strategy'
    )
  ),
  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null,
  storage_path text not null,
  thumbnail_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists works_category_idx on public.works (category);
create index if not exists works_sort_idx on public.works (sort_order desc, created_at desc);

alter table public.works enable row level security;

-- Anyone can view published works
create policy "Public read works"
  on public.works for select
  using (true);

-- Only authenticated admins can insert/update/delete
create policy "Admin insert works"
  on public.works for insert
  to authenticated
  with check (true);

create policy "Admin update works"
  on public.works for update
  to authenticated
  using (true);

create policy "Admin delete works"
  on public.works for delete
  to authenticated
  using (true);

-- Storage bucket for portfolio media
insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do nothing;

-- Public read for portfolio files
create policy "Public read portfolio media"
  on storage.objects for select
  using (bucket_id = 'portfolio-media');

-- Authenticated users can upload
create policy "Admin upload portfolio media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'portfolio-media');

-- Authenticated users can update their uploads
create policy "Admin update portfolio media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'portfolio-media');

-- Authenticated users can delete
create policy "Admin delete portfolio media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'portfolio-media');
