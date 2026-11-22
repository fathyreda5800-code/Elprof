alter table public.profiles
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '';

update public.profiles as profiles
set
  email = coalesce(users.email, ''),
  phone = coalesce(users.raw_user_meta_data ->> 'phone', '')
from auth.users as users
where users.id = profiles.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'student'
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone;
  return new;
end;
$$;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set
    full_name = coalesce(new.raw_user_meta_data ->> 'full_name', full_name),
    email = coalesce(new.email, ''),
    phone = coalesce(new.raw_user_meta_data ->> 'phone', phone)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.sync_profile_from_auth_user();

create or replace function public.is_elprof_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as users
    join public.profiles as profiles on profiles.id = users.id
    where users.id = auth.uid()
      and lower(coalesce(users.email, '')) = 'ahmed@gmail.com'
      and profiles.role = 'teacher'
  );
$$;

revoke all on function public.is_elprof_teacher() from public, anon;
grant execute on function public.is_elprof_teacher() to authenticated;

create policy "profiles_teacher_read_students"
  on public.profiles for select
  using (role = 'student' and public.is_elprof_teacher());
