# Panduan: Dukungan Laporan & Keluhan Warga Otomatis Tersimpan di Supabase

Semua fitur (laporan baru, dukungan permanen, dan kotak keluhan warga) kini sudah terhubung penuh ke database Supabase.

---

## Langkah 1: Jalankan Query SQL Lengkap di Supabase
1. Buka dashboard project Anda di **https://supabase.com**.
2. Masuk ke menu **SQL Editor** di sidebar kiri > klik **New Query**.
3. Salin dan tempel (paste) kode SQL berikut, lalu klik tombol **Run**:

```sql
-- 1. Tabel laporan & dukungan
create table if not exists public.reports (
  id            text primary key,
  code          text unique,
  category      text not null,
  description   text,
  kec           text not null,
  lat           double precision not null,
  lng           double precision not null,
  status        text not null default 'diterima',
  support_count integer not null default 0 check (support_count >= 0),
  is_demo       boolean not null default false,
  needs_review  boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists public.report_supports (
  report_id  text not null references public.reports(id) on delete cascade,
  device_id  text not null check (char_length(device_id) between 8 and 64),
  created_at timestamptz not null default now(),
  primary key (report_id, device_id)
);

-- 2. Fungsi submit_report: mencatat laporan baru
create or replace function public.submit_report(
  p_id text,
  p_code text,
  p_category text,
  p_description text,
  p_kec text,
  p_lat double precision,
  p_lng double precision,
  p_needs_review boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.reports (
    id, code, category, description, kec, lat, lng, status, support_count, is_demo, needs_review, created_at
  )
  values (
    p_id,
    p_code,
    p_category,
    p_description,
    p_kec,
    p_lat,
    p_lng,
    'diterima',
    0,
    false,
    coalesce(p_needs_review, false),
    now()
  )
  on conflict (id) do update set
    code = excluded.code,
    category = excluded.category,
    description = excluded.description,
    kec = excluded.kec,
    lat = excluded.lat,
    lng = excluded.lng;

  return p_id;
end $$;

-- 3. Fungsi support_report: menambah dukungan secara atomik
create or replace function public.support_report(p_report_id text, p_device_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
  total    integer;
begin
  insert into public.report_supports (report_id, device_id)
  values (p_report_id, p_device_id)
  on conflict do nothing;
  get diagnostics inserted = row_count;

  if inserted = 1 then
    update public.reports set support_count = support_count + 1 where id = p_report_id;
  end if;

  select support_count into total from public.reports where id = p_report_id;
  return total;
end $$;

-- 4. Tabel keluhan dan masukan warga
create table if not exists public.complaints (
  id          text primary key,
  type        text not null,
  ticket_code text,
  sender      text,
  contact     text,
  message     text not null,
  status      text not null default 'Belum Ditinjau',
  created_at  timestamptz not null default now()
);

-- Fungsi kirim keluhan
create or replace function public.submit_complaint(
  p_id text,
  p_type text,
  p_ticket_code text,
  p_sender text,
  p_contact text,
  p_message text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.complaints (
    id, type, ticket_code, sender, contact, message, status, created_at
  )
  values (
    p_id,
    p_type,
    p_ticket_code,
    coalesce(nullif(trim(p_sender), ''), 'Warga Sidoarjo'),
    p_contact,
    p_message,
    'Belum Ditinjau',
    now()
  )
  on conflict (id) do nothing;

  return p_id;
end $$;

-- Fungsi ubah status keluhan
create or replace function public.update_complaint_status(
  p_id text,
  p_status text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.complaints
  set status = p_status
  where id = p_id;

  return p_id;
end $$;

-- Fungsi hapus keluhan
create or replace function public.delete_complaint(
  p_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.complaints
  where id = p_id;

  return p_id;
end $$;

-- 5. Views & Keamanan (RLS)
create or replace view public.public_reports as
  select id, category, description, kec, lat, lng, status, support_count, is_demo, created_at
  from public.reports;

create or replace view public.public_complaints as
  select id, type, ticket_code, sender, contact, message, status, created_at
  from public.complaints;

alter table public.reports enable row level security;
alter table public.report_supports enable row level security;
alter table public.complaints enable row level security;

revoke all on public.reports, public.report_supports, public.complaints from anon, authenticated;

grant select on public.public_reports to anon, authenticated;
grant select on public.public_complaints to anon, authenticated;
grant execute on function public.support_report(text, text) to anon, authenticated;
grant execute on function public.submit_report(text, text, text, text, text, double precision, double precision, boolean) to anon, authenticated;
grant execute on function public.submit_complaint(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_complaint_status(text, text) to anon, authenticated;
grant execute on function public.delete_complaint(text) to anon, authenticated;
```

---

## Langkah 2: Pastikan Kunci Supabase di `.env`
Buka file `.env` di komputer Anda, pastikan sudah terisi URL dan anon key:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Langkah 3: Uji Coba Terpisah
1. **Website Warga Publik**:
   * Akses `http://localhost:5173`. Tidak ada tombol atau menu menuju Admin.
   * Kirim pesan di halaman `http://localhost:5173/#/tim`.
2. **Database Supabase**:
   * Buka menu **Table Editor** > tabel `complaints`. Pesan warga langsung muncul secara permanen.
3. **Portal Admin**:
   * Akses langsung lewat URL terpisah `http://localhost:5173/#/admin`.
   * Di tab **Kotak Keluhan**, pesan dari Supabase langsung tampil lengkap dan dapat diubah statusnya atau dihapus.
