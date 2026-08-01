-- Special Cutz Portfolio — Supabase setup
-- Run this in Supabase Dashboard → SQL Editor.
-- The whole file is safe to re-run; existing data is never dropped.

-- ---------------------------------------------------------------------------
-- Works
-- Categories: video-production | social-media | video-editing | content-strategy
-- ---------------------------------------------------------------------------

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
drop policy if exists "Public read works" on public.works;
create policy "Public read works"
  on public.works for select
  using (true);

-- Only authenticated admins can insert/update/delete
drop policy if exists "Admin insert works" on public.works;
create policy "Admin insert works"
  on public.works for insert
  to authenticated
  with check (true);

drop policy if exists "Admin update works" on public.works;
create policy "Admin update works"
  on public.works for update
  to authenticated
  using (true);

drop policy if exists "Admin delete works" on public.works;
create policy "Admin delete works"
  on public.works for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Testimonials
-- ---------------------------------------------------------------------------

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author_name text not null,
  author_role text,
  avatar_url text,
  storage_path text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists testimonials_sort_idx
  on public.testimonials (sort_order desc, created_at desc);

alter table public.testimonials enable row level security;

drop policy if exists "Public read testimonials" on public.testimonials;
create policy "Public read testimonials"
  on public.testimonials for select
  using (true);

drop policy if exists "Admin insert testimonials" on public.testimonials;
create policy "Admin insert testimonials"
  on public.testimonials for insert
  to authenticated
  with check (true);

drop policy if exists "Admin update testimonials" on public.testimonials;
create policy "Admin update testimonials"
  on public.testimonials for update
  to authenticated
  using (true);

drop policy if exists "Admin delete testimonials" on public.testimonials;
create policy "Admin delete testimonials"
  on public.testimonials for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for portfolio media and testimonial photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do nothing;

-- Public read for portfolio files
drop policy if exists "Public read portfolio media" on storage.objects;
create policy "Public read portfolio media"
  on storage.objects for select
  using (bucket_id = 'portfolio-media');

-- Authenticated users can upload
drop policy if exists "Admin upload portfolio media" on storage.objects;
create policy "Admin upload portfolio media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'portfolio-media');

-- Authenticated users can update their uploads
drop policy if exists "Admin update portfolio media" on storage.objects;
create policy "Admin update portfolio media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'portfolio-media');

-- Authenticated users can delete
drop policy if exists "Admin delete portfolio media" on storage.objects;
create policy "Admin delete portfolio media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'portfolio-media');
