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
alter table public.profiles add column if not exists display_name text not null default '';
alter table public.profiles add column if not exists show_on_leaderboard boolean not null default false;
alter table public.profiles add column if not exists age_confirmed_at timestamptz;
alter table public.profiles add column if not exists last_active_at timestamptz;
alter table public.profiles add column if not exists avatar_id text not null default 'mint-owl';

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'profiles_avatar_id_allowed'
          and conrelid = 'public.profiles'::regclass
    ) then
        alter table public.profiles add constraint profiles_avatar_id_allowed
            check (avatar_id in (
                'mint-owl', 'sky-cat', 'coral-fox', 'lilac-bunny',
                'sunny-bear', 'teal-frog', 'peach-panda', 'blue-robot'
            ));
    end if;
end;
$$;

update public.profiles as profile
set last_active_at = coalesce(
    (select auth_user.last_sign_in_at from auth.users as auth_user where auth_user.id = profile.id),
    profile.created_at,
    now()
)
where profile.last_active_at is null;

alter table public.profiles alter column last_active_at set default now();
alter table public.profiles alter column last_active_at set not null;

do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conname = 'profiles_display_name_format'
          and conrelid = 'public.profiles'::regclass
    ) then
        alter table public.profiles add constraint profiles_display_name_format
            check (display_name = '' or display_name ~ '^[A-Za-z0-9_ ]{3,20}$');
    end if;
end;
$$;

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select, insert, update on public.profiles to authenticated;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'profiles'
          and policyname = 'Users can read their own profile'
    ) then
        create policy "Users can read their own profile"
            on public.profiles for select
            to authenticated
            using ((select auth.uid()) = id);
    end if;
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'profiles'
          and policyname = 'Users can create their own profile'
    ) then
        create policy "Users can create their own profile"
            on public.profiles for insert
            to authenticated
            with check ((select auth.uid()) = id);
    end if;
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'profiles'
          and policyname = 'Users can update their own profile'
    ) then
        create policy "Users can update their own profile"
            on public.profiles for update
            to authenticated
            using ((select auth.uid()) = id)
            with check ((select auth.uid()) = id);
    end if;
end;
$$;

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

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'course_progress'
          and policyname = 'Users can read their own course progress'
    ) then
        create policy "Users can read their own course progress"
            on public.course_progress for select
            to authenticated
            using ((select auth.uid()) = user_id);
    end if;
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'course_progress'
          and policyname = 'Users can create their own course progress'
    ) then
        create policy "Users can create their own course progress"
            on public.course_progress for insert
            to authenticated
            with check ((select auth.uid()) = user_id);
    end if;
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'course_progress'
          and policyname = 'Users can update their own course progress'
    ) then
        create policy "Users can update their own course progress"
            on public.course_progress for update
            to authenticated
            using ((select auth.uid()) = user_id)
            with check ((select auth.uid()) = user_id);
    end if;
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'course_progress'
          and policyname = 'Users can delete their own course progress'
    ) then
        create policy "Users can delete their own course progress"
            on public.course_progress for delete
            to authenticated
            using ((select auth.uid()) = user_id);
    end if;
end;
$$;

create table if not exists public.learning_activity (
    user_id uuid not null references auth.users (id) on delete cascade,
    activity_date date not null default (timezone('utc', now()))::date,
    created_at timestamptz not null default now(),
    primary key (user_id, activity_date)
);

alter table public.learning_activity enable row level security;
revoke all on public.learning_activity from anon;
grant select, insert on public.learning_activity to authenticated;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'learning_activity'
          and policyname = 'Users can read their own learning activity'
    ) then
        create policy "Users can read their own learning activity"
            on public.learning_activity for select
            to authenticated
            using ((select auth.uid()) = user_id);
    end if;
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'learning_activity'
          and policyname = 'Users can record their own learning activity'
    ) then
        create policy "Users can record their own learning activity"
            on public.learning_activity for insert
            to authenticated
            with check ((select auth.uid()) = user_id);
    end if;
end;
$$;

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

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    new.last_active_at = now();
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute procedure public.set_profile_updated_at();

create table if not exists public.consent_records (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    purpose text not null check (purpose in ('account_use', 'leaderboard', 'product_updates', 'analytics')),
    granted boolean not null,
    notice_version text not null,
    created_at timestamptz not null default now()
);

alter table public.consent_records enable row level security;
grant usage on schema public to authenticated;
revoke all on public.consent_records from anon;
revoke all on public.consent_records from authenticated;
grant select on public.consent_records to authenticated;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'consent_records'
          and policyname = 'Users can read their own consent records'
    ) then
        create policy "Users can read their own consent records"
            on public.consent_records for select
            to authenticated
            using ((select auth.uid()) = user_id);
    end if;
end;
$$;

create or replace function public.save_initial_consents(
    p_display_name text,
    p_leaderboard boolean,
    p_product_updates boolean,
    p_analytics boolean,
    p_notice_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    current_user_id uuid := auth.uid();
begin
    if current_user_id is null then
        raise exception 'Authentication required';
    end if;
    if p_notice_version <> '2026-10-v1' then
        raise exception 'Privacy notice has changed; refresh the page.';
    end if;
    if p_leaderboard and (
        p_display_name is null
        or length(btrim(p_display_name)) not between 3 and 20
        or btrim(p_display_name) !~ '^[A-Za-z0-9_ ]{3,20}$'
        or exists (
            select 1
            from public.profiles as profile
            where profile.id = current_user_id
              and lower(btrim(p_display_name)) in (
                  lower(btrim(profile.full_name)),
                  lower(split_part(profile.email, '@', 1))
              )
        )
    ) then
        raise exception 'Enter a valid leaderboard nickname.';
    end if;

    update public.profiles
    set age_confirmed_at = now(),
        show_on_leaderboard = p_leaderboard,
        display_name = case when p_leaderboard then btrim(p_display_name) else '' end
    where id = current_user_id;

    if not found then
        raise exception 'Student profile is unavailable.';
    end if;

    insert into public.consent_records (user_id, purpose, granted, notice_version)
    values
        (current_user_id, 'account_use', true, p_notice_version),
        (current_user_id, 'leaderboard', p_leaderboard, p_notice_version),
        (current_user_id, 'product_updates', p_product_updates, p_notice_version),
        (current_user_id, 'analytics', p_analytics, p_notice_version);
end;
$function$;

create or replace function public.set_optional_consent(
    p_purpose text,
    p_granted boolean,
    p_notice_version text,
    p_display_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
    current_user_id uuid := auth.uid();
begin
    if current_user_id is null then
        raise exception 'Authentication required';
    end if;
    if not exists (
        select 1
        from public.consent_records as consent
        where consent.user_id = current_user_id
          and consent.purpose = 'account_use'
          and consent.granted = true
          and consent.notice_version = '2026-10-v1'
    ) then
        raise exception 'Account-use consent is required.';
    end if;
    if p_notice_version <> '2026-10-v1' then
        raise exception 'Privacy notice has changed; refresh the page.';
    end if;
    if p_purpose not in ('leaderboard', 'product_updates', 'analytics') then
        raise exception 'Unsupported optional consent purpose.';
    end if;
    if p_purpose = 'leaderboard' and p_granted and (
        p_display_name is null
        or length(btrim(p_display_name)) not between 3 and 20
        or btrim(p_display_name) !~ '^[A-Za-z0-9_ ]{3,20}$'
        or exists (
            select 1
            from public.profiles as profile
            where profile.id = current_user_id
              and lower(btrim(p_display_name)) in (
                  lower(btrim(profile.full_name)),
                  lower(split_part(profile.email, '@', 1))
              )
        )
    ) then
        raise exception 'Enter a valid leaderboard nickname.';
    end if;

    if p_purpose = 'leaderboard' then
        update public.profiles
        set show_on_leaderboard = p_granted,
            display_name = case when p_granted then btrim(p_display_name) else '' end
        where id = current_user_id;
        if not found then
            raise exception 'Student profile is unavailable.';
        end if;
    end if;

    insert into public.consent_records (user_id, purpose, granted, notice_version)
    values (current_user_id, p_purpose, p_granted, p_notice_version);
end;
$function$;

revoke all on function public.save_initial_consents(text, boolean, boolean, boolean, text) from public, anon;
grant execute on function public.save_initial_consents(text, boolean, boolean, boolean, text) to authenticated;
revoke all on function public.set_optional_consent(text, boolean, text, text) from public, anon;
grant execute on function public.set_optional_consent(text, boolean, text, text) to authenticated;

create table if not exists public.leaderboard_course_catalog (
    course_id text primary key,
    module_count integer not null check (module_count > 0)
);

alter table public.leaderboard_course_catalog enable row level security;
revoke all on public.leaderboard_course_catalog from anon, authenticated;

insert into public.leaderboard_course_catalog (course_id, module_count)
values
    ('python', 4),
    ('dbms', 5),
    ('daa', 4),
    ('ai', 4),
    ('dccn', 4),
    ('se', 4),
    ('cg', 3),
    ('ot', 3),
    ('c_programming', 4),
    ('computer_fundamentals', 4),
    ('mathematics_i', 4),
    ('communication_skills', 4),
    ('data_structures', 4),
    ('cpp', 4),
    ('digital_logic', 4),
    ('accounting', 4),
    ('java', 4),
    ('web_technology', 4),
    ('computer_architecture', 4),
    ('software_testing', 4),
    ('cloud_computing', 4),
    ('cyber_security', 4),
    ('data_mining', 4),
    ('project_work', 4)
on conflict (course_id) do update
set module_count = excluded.module_count;

drop function if exists public.get_student_leaderboard();

create function public.get_student_leaderboard()
returns table (
    leaderboard_rank bigint,
    display_name text,
    points bigint,
    current_streak bigint,
    completed_courses bigint,
    is_current_user boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
    if auth.uid() is null then
        raise exception 'Authentication required';
    end if;
    if not exists (
        select 1
        from public.consent_records as consent
        where consent.user_id = auth.uid()
          and consent.purpose = 'account_use'
          and consent.granted = true
          and consent.notice_version = '2026-10-v1'
    ) then
        raise exception 'Account-use consent is required.';
    end if;

    return query
    with utc_today as (
        select (timezone('utc', now()))::date as activity_date
    ),
    user_profiles as (
        select
            profile.id,
            profile.display_name
        from public.profiles as profile
        where profile.show_on_leaderboard = true
          and profile.display_name <> ''
          and lower(profile.display_name) <> lower(btrim(profile.full_name))
          and lower(profile.display_name) <> lower(split_part(profile.email, '@', 1))
          and (
              select consent.granted
              from public.consent_records as consent
              where consent.user_id = profile.id
                and consent.purpose = 'leaderboard'
                and consent.notice_version = '2026-10-v1'
              order by consent.created_at desc, consent.id desc
              limit 1
          ) is true
    ),
    streak_starts as (
        select
            profile.id,
            case
                when exists (
                    select 1
                    from public.learning_activity as activity
                    where activity.user_id = profile.id
                      and activity.activity_date = utc_today.activity_date
                ) then utc_today.activity_date
                when exists (
                    select 1
                    from public.learning_activity as activity
                    where activity.user_id = profile.id
                      and activity.activity_date = utc_today.activity_date - 1
                ) then utc_today.activity_date - 1
                else null
            end as start_date
        from user_profiles as profile
        cross join utc_today
    ),
    user_stats as (
        select
            profile.id,
            profile.display_name,
            coalesce(streaks.current_streak, 0)::bigint as current_streak,
            coalesce(course_totals.completed_courses, 0)::bigint as completed_courses
        from user_profiles as profile
        join streak_starts on streak_starts.id = profile.id
        left join lateral (
            select coalesce(min(day_offsets.day_offset), 0)::bigint as current_streak
            from generate_series(
                0,
                (
                    select count(*)::integer
                    from public.learning_activity as history
                    where history.user_id = profile.id
                )
            ) as day_offsets(day_offset)
            where streak_starts.start_date is not null
              and not exists (
                  select 1
                  from public.learning_activity as activity
                  where activity.user_id = profile.id
                    and activity.activity_date = streak_starts.start_date - day_offsets.day_offset
              )
        ) as streaks on true
        left join lateral (
            select count(*)::bigint as completed_courses
            from (
                select progress.course_id
                from public.course_progress as progress
                join public.leaderboard_course_catalog as catalog
                  on catalog.course_id = progress.course_id
                where progress.user_id = profile.id
                  and progress.module_index < catalog.module_count
                group by progress.course_id, catalog.module_count
                having count(distinct progress.module_index)
                    filter (where progress.completed) >= catalog.module_count
            ) as completed
        ) as course_totals on true
    ),
    scored_students as (
        select
            stats.id,
            stats.display_name,
            stats.current_streak,
            stats.completed_courses,
            (stats.current_streak + stats.completed_courses * 10)::bigint as points
        from user_stats as stats
    ),
    ranked_students as (
        select
            row_number() over (
                order by
                    scored.points desc,
                    scored.completed_courses desc,
                    scored.current_streak desc,
                    scored.display_name asc
            ) as leaderboard_rank,
            scored.id,
            scored.display_name,
            scored.points,
            scored.current_streak,
            scored.completed_courses
        from scored_students as scored
    )
    select
        ranked.leaderboard_rank,
        ranked.display_name,
        ranked.points,
        ranked.current_streak,
        ranked.completed_courses,
        ranked.id = auth.uid()
    from ranked_students as ranked
    where ranked.leaderboard_rank <= 50
       or ranked.id = auth.uid()
    order by ranked.leaderboard_rank;
end;
$function$;

revoke all on function public.get_student_leaderboard() from public, anon;
grant execute on function public.get_student_leaderboard() to authenticated;

notify pgrst, 'reload schema';
