-- Ranawarta: skema Supabase (PostgreSQL). Jalankan di Supabase > SQL Editor > New query > Run.
-- Aman dijalankan ulang (memakai IF NOT EXISTS / OR REPLACE).

-- 1. Tabel laporan ---------------------------------------------------------
create table if not exists public.reports (
  id            text primary key,                 -- id laporan (cocok dengan id di seed-reports.json)
  code          text unique,                      -- kode tiket RW-XXXX (RAHASIA, tidak tampil publik)
  category      text not null,
  description   text,
  kec           text not null,                    -- id kecamatan, sama dengan kecamatan-info.json
  lat           double precision not null,
  lng           double precision not null,
  status        text not null default 'diterima',
  support_count integer not null default 0 check (support_count >= 0),
  is_demo       boolean not null default false,   -- true = DATA CONTOH
  needs_review  boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists reports_kec_idx     on public.reports (kec);
create index if not exists reports_created_idx on public.reports (created_at desc);

-- 2. Tabel dukungan: satu perangkat hanya sekali per laporan ------------------
create table if not exists public.report_supports (
  report_id  text not null references public.reports(id) on delete cascade,
  device_id  text not null check (char_length(device_id) between 8 and 64),
  created_at timestamptz not null default now(),
  primary key (report_id, device_id)              -- kunci ini yang mencegah dukung ganda
);

-- 3. Fungsi dukung (atomik, idempoten) ----------------------------------------
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
  return total;                                    -- null bila laporan tidak ada
end $$;

-- 4. Keamanan (RLS): browser TIDAK boleh baca/ubah tabel langsung ---------------
alter table public.reports         enable row level security;
alter table public.report_supports enable row level security;
revoke all on public.reports, public.report_supports from anon, authenticated;

grant execute on function public.support_report(text, text) to anon, authenticated;

create or replace function public.support_report_once(p_report_id text, p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
  total integer;
begin
  insert into public.report_supports (report_id, device_id)
  values (p_report_id, p_device_id)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 1 then
    update public.reports set support_count = support_count + 1 where id = p_report_id;
  end if;
  select support_count into total from public.reports where id = p_report_id;
  if total is null then raise exception 'Laporan tidak ditemukan'; end if;
  return jsonb_build_object('count', total, 'recorded', inserted = 1);
end $$;
grant execute on function public.support_report_once(text, text) to anon, authenticated;

create or replace function public.get_my_report_supports(p_device_id text)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select report_id
  from public.report_supports
  where device_id = p_device_id
$$;
grant execute on function public.get_my_report_supports(text) to anon, authenticated;

-- 6. Fungsi submit_report: warga mengirim laporan baru secara aman --------------
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

grant execute on function public.submit_report(text, text, text, text, text, double precision, double precision, boolean) to anon, authenticated;

-- 7. Tabel keluhan dan masukan warga ----------------------------------------
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
create index if not exists complaints_created_idx on public.complaints (created_at desc);

-- Fungsi submit_complaint: warga mengirim keluhan/masukan secara aman
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

-- Fungsi update_complaint_status
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

-- Fungsi delete_complaint
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

-- RLS untuk keluhan
alter table public.complaints enable row level security;
revoke all on public.complaints from anon, authenticated;

grant execute on function public.submit_complaint(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_complaint_status(text, text) to anon, authenticated;
grant execute on function public.delete_complaint(text) to anon, authenticated;

-- 8. Persistensi laporan, moderasi, suara warga, dan autentikasi Admin ----------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_users' and policyname = 'Admins can read their own role') then
    create policy "Admins can read their own role" on public.admin_users for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

alter table public.reports
  add column if not exists history jsonb not null default '[]'::jsonb,
  add column if not exists photo_path text,
  add column if not exists moderation_status text not null default 'Lolos Moderasi',
  add column if not exists moderation_note text not null default '',
  add column if not exists photo_flagged boolean not null default false,
  add column if not exists moderated_at timestamptz,
  add column if not exists dispute_note text not null default '',
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists confirmation jsonb,
  add column if not exists ai_check jsonb,
  add column if not exists captured_at timestamptz;

update public.reports
set code = 'RW-' || replace(id, 'R', '1')
where is_demo and code is null and id ~ '^R[0-9]+$';

create table if not exists public.report_votes (
  report_id text not null references public.reports(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 64),
  vote text not null check (vote in ('masih', 'diperbaiki', 'salah')),
  created_at timestamptz not null default now(),
  primary key (report_id, device_id)
);
alter table public.report_votes enable row level security;
revoke all on public.report_votes from anon, authenticated;

create or replace view public.public_reports as
  select r.id, r.category, r.description, r.kec, r.lat, r.lng, r.status,
    r.support_count, r.is_demo, r.created_at,
    case when r.photo_flagged then null else r.photo_path end as photo_path,
    r.needs_review,
    r.history, r.confirmation,
    jsonb_build_object(
      'masih', count(v.report_id) filter (where v.vote = 'masih'),
      'diperbaiki', count(v.report_id) filter (where v.vote = 'diperbaiki'),
      'salah', count(v.report_id) filter (where v.vote = 'salah')
    ) as votes
  from public.reports r
  left join public.report_votes v on v.report_id = r.id
  where not r.is_deleted
  group by r.id;
grant select on public.public_reports to anon, authenticated;

drop view if exists public.public_complaints;
create view public.public_complaints as
  select id, type, ticket_code, status, created_at from public.complaints;
revoke all on public.public_complaints from anon, authenticated;

create or replace function public.submit_report(
  p_id text,
  p_code text,
  p_category text,
  p_description text,
  p_kec text,
  p_lat double precision,
  p_lng double precision,
  p_needs_review boolean default false,
  p_photo_path text default null,
  p_ai_check jsonb default null,
  p_captured_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.reports (
    id, code, category, description, kec, lat, lng, status,
    support_count, is_demo, needs_review, history, photo_path, ai_check, captured_at, created_at
  )
  values (
    p_id, p_code, p_category, p_description, p_kec, p_lat, p_lng,
    'diterima', 0, false, coalesce(p_needs_review, false),
    jsonb_build_array(jsonb_build_object('status', 'diterima', 'at', now())),
    p_photo_path, p_ai_check, p_captured_at, now()
  )
  on conflict (id) do nothing;
  return p_id;
end $$;
grant execute on function public.submit_report(text, text, text, text, text, double precision, double precision, boolean, text, jsonb, timestamptz) to anon, authenticated;
revoke execute on function public.submit_report(text, text, text, text, text, double precision, double precision, boolean) from anon, authenticated;
revoke all on function public.submit_report(text, text, text, text, text, double precision, double precision, boolean) from public;

create or replace function public.vote_report(p_report_id text, p_device_id text, p_vote text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted integer;
  saved_vote text;
begin
  if p_vote not in ('masih', 'diperbaiki', 'salah') then
    raise exception 'Pilihan suara tidak valid';
  end if;
  insert into public.report_votes (report_id, device_id, vote)
  values (p_report_id, p_device_id, p_vote)
  on conflict (report_id, device_id) do nothing;
  get diagnostics inserted = row_count;
  select vote into saved_vote from public.report_votes
  where report_id = p_report_id and device_id = p_device_id;
  return jsonb_build_object('recorded', inserted = 1, 'vote', saved_vote);
end $$;
grant execute on function public.vote_report(text, text, text) to anon, authenticated;

create or replace function public.get_public_report(p_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(r) || jsonb_build_object(
    'photo_path', case when r.photo_flagged then null else r.photo_path end
  ) || jsonb_build_object(
    'votes', jsonb_build_object(
      'masih', (select count(*) from public.report_votes where report_id = r.id and vote = 'masih'),
      'diperbaiki', (select count(*) from public.report_votes where report_id = r.id and vote = 'diperbaiki'),
      'salah', (select count(*) from public.report_votes where report_id = r.id and vote = 'salah')
    )
  )
  from public.reports r
  where r.code = upper(trim(p_code)) and not r.is_deleted and not r.is_demo
  limit 1
$$;
grant execute on function public.get_public_report(text) to anon, authenticated;

create or replace function public.confirm_report(
  p_code text,
  p_result text,
  p_confirmation jsonb,
  p_needs_review boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  if p_result not in ('selesai', 'belum') then
    raise exception 'Konfirmasi tidak valid';
  end if;
  next_status := case when p_result = 'selesai' then 'terkonfirmasi' else 'disengketakan' end;
  update public.reports
  set status = next_status,
      needs_review = coalesce(p_needs_review, false),
      confirmation = p_confirmation,
      history = history || jsonb_build_array(jsonb_build_object('status', next_status, 'at', now()))
  where code = upper(trim(p_code)) and not is_demo and not is_deleted and status = 'selesai_dinas';
  if not found then raise exception 'Laporan tidak ditemukan atau belum dapat dikonfirmasi'; end if;
  return p_code;
end $$;
grant execute on function public.confirm_report(text, text, jsonb, boolean) to anon, authenticated;

create or replace function public.update_confirmation_review(
  p_code text,
  p_confirmation jsonb,
  p_needs_review boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reports
  set confirmation = p_confirmation,
      needs_review = coalesce(p_needs_review, false)
  where code = upper(trim(p_code)) and not is_demo and not is_deleted
    and confirmation is not null;
  if not found then raise exception 'Konfirmasi laporan tidak ditemukan'; end if;
  return p_code;
end $$;
grant execute on function public.update_confirmation_review(text, jsonb, boolean) to anon, authenticated;

create or replace function public.admin_get_reports()
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Akses Admin diperlukan';
  end if;
  return query
    select to_jsonb(r) || jsonb_build_object(
      'votes', jsonb_build_object(
        'masih', (select count(*) from public.report_votes where report_id = r.id and vote = 'masih'),
        'diperbaiki', (select count(*) from public.report_votes where report_id = r.id and vote = 'diperbaiki'),
        'salah', (select count(*) from public.report_votes where report_id = r.id and vote = 'salah')
      )
    )
    from public.reports r
    order by r.is_deleted, r.needs_review desc, r.created_at desc;
end $$;

create or replace function public.admin_update_report(p_code text, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.reports;
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Akses Admin diperlukan';
  end if;
  update public.reports r set
    status = case when p_patch ? 'status' then p_patch->>'status' else r.status end,
    needs_review = case when p_patch ? 'needs_review' then (p_patch->>'needs_review')::boolean else r.needs_review end,
    history = case when p_patch ? 'history' then p_patch->'history' else r.history end,
    moderation_status = case when p_patch ? 'moderation_status' then p_patch->>'moderation_status' else r.moderation_status end,
    moderation_note = case when p_patch ? 'moderation_note' then p_patch->>'moderation_note' else r.moderation_note end,
    photo_flagged = case when p_patch ? 'photoFlagged' then (p_patch->>'photoFlagged')::boolean else r.photo_flagged end,
    moderated_at = case when p_patch ? 'moderated_at' then (p_patch->>'moderated_at')::timestamptz else r.moderated_at end,
    dispute_note = case when p_patch ? 'dispute_note' then p_patch->>'dispute_note' else r.dispute_note end,
    is_deleted = case when p_patch ? 'is_deleted' then (p_patch->>'is_deleted')::boolean else r.is_deleted end,
    deleted_at = case when p_patch ? 'is_deleted' then case when (p_patch->>'is_deleted')::boolean then now() else null end else r.deleted_at end,
    confirmation = case when p_patch ? 'confirmation' then p_patch->'confirmation' else r.confirmation end
  where r.code = upper(trim(p_code))
  returning r.* into result;
  if not found then raise exception 'Laporan tidak ditemukan'; end if;
  return to_jsonb(result);
end $$;

create or replace function public.admin_get_complaints()
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Akses Admin diperlukan';
  end if;
  return query select to_jsonb(c) from public.complaints c order by c.created_at desc;
end $$;

create or replace function public.update_complaint_status(p_id text, p_status text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Akses Admin diperlukan';
  end if;
  update public.complaints set status = p_status where id = p_id;
  return p_id;
end $$;

create or replace function public.delete_complaint(p_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Akses Admin diperlukan';
  end if;
  delete from public.complaints where id = p_id;
  return p_id;
end $$;

revoke execute on function public.update_complaint_status(text, text) from anon;
revoke execute on function public.delete_complaint(text) from anon;
grant execute on function public.update_complaint_status(text, text) to authenticated;
grant execute on function public.delete_complaint(text) to authenticated;
grant execute on function public.admin_get_reports() to authenticated;
grant execute on function public.admin_update_report(text, jsonb) to authenticated;
grant execute on function public.admin_get_complaints() to authenticated;

-- Public photo reads and report submissions; report moderation/deletion requires Admin Auth.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public can read report photos') then
    create policy "Public can read report photos" on storage.objects for select using (bucket_id = 'report-photos');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Visitors can upload report photos') then
    create policy "Visitors can upload report photos" on storage.objects for insert to anon, authenticated with check (bucket_id = 'report-photos');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Admins can delete report photos') then
    create policy "Admins can delete report photos" on storage.objects for delete to authenticated
      using (bucket_id = 'report-photos' and exists (select 1 from public.admin_users where user_id = auth.uid()));
  end if;
end $$;
