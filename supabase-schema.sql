create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text not null default '',
    email text not null default '',
    bio text not null default '',
    website_url text not null default '',
    instagram_url text not null default '',
    linkedin_url text not null default '',
    github_url text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists website_url text not null default '';
alter table public.profiles add column if not exists instagram_url text not null default '';
alter table public.profiles add column if not exists linkedin_url text not null default '';
alter table public.profiles add column if not exists github_url text not null default '';

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
    on public.profiles for select
    to authenticated
    using ((select auth.uid()) = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
    on public.profiles for insert
    to authenticated
    with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

create table if not exists public.course_progress (
    user_id uuid not null references auth.users (id) on delete cascade,
    course_id text not null,
    module_index integer not null check (module_index >= 0),
    completed boolean not null default true,
    updated_at timestamptz not null default now(),
    primary key (user_id, course_id, module_index)
);

alter table public.course_progress enable row level security;
revoke all on public.course_progress from anon;
grant select, insert, update, delete on public.course_progress to authenticated;

drop policy if exists "Users can read their own course progress" on public.course_progress;
create policy "Users can read their own course progress"
    on public.course_progress for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own course progress" on public.course_progress;
create policy "Users can create their own course progress"
    on public.course_progress for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own course progress" on public.course_progress;
create policy "Users can update their own course progress"
    on public.course_progress for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own course progress" on public.course_progress;
create policy "Users can delete their own course progress"
    on public.course_progress for delete
    to authenticated
    using ((select auth.uid()) = user_id);

create table if not exists public.learning_activity (
    user_id uuid not null references auth.users (id) on delete cascade,
    activity_date date not null default (timezone('utc', now()))::date,
    created_at timestamptz not null default now(),
    primary key (user_id, activity_date)
);

alter table public.learning_activity enable row level security;
revoke all on public.learning_activity from anon;
grant select, insert on public.learning_activity to authenticated;

drop policy if exists "Users can read their own learning activity" on public.learning_activity;
create policy "Users can read their own learning activity"
    on public.learning_activity for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can record their own learning activity" on public.learning_activity;
create policy "Users can record their own learning activity"
    on public.learning_activity for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, full_name, email)
    values (
        new.id,
        coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Student'),
        coalesce(new.email, '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
    after insert on auth.users
    for each row execute procedure public.create_profile_for_new_user();

notify pgrst, 'reload schema';
