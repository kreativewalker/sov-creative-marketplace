-- SOV artist accounts: schema, security rules and private photo storage.

create type public.app_status as enum ('draft','submitted','in_review','call_invited','call_booked','approved','active','not_a_fit','withdrawn');

create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.staff enable row level security;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

create policy "staff see themselves" on public.staff for select to authenticated using (user_id = auth.uid());

create table public.artists (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text, legal_name text, pronouns text, phone text, city_state text, zip text,
  travel_range text, is_adult boolean not null default false,
  disciplines text[] not null default '{}', disciplines_other text, services text[] not null default '{}',
  portfolio_url text, social_url text, largest_piece text, where_shown text, where_shown_types text[] not null default '{}', can_install text,
  min_project text, day_rate integer check (day_rate is null or day_rate >= 0), notice text, insurance text,
  ref_name text, ref_relationship text, ref_org text, ref_contact text, ref_project text,
  heard_from text, heard_ai_tool text, heard_ai_prompt text, heard_referrer text, heard_event text,
  utm jsonb,
  consent_public_profile text, consent_news text,
  terms_accepted_at timestamptz, terms_version text,
  bio text, statement text,
  status public.app_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.artists enable row level security;

create policy "artists read own" on public.artists for select to authenticated using (id = (select auth.uid()) or (select public.is_staff()));
create policy "artists create own" on public.artists for insert to authenticated with check (id = (select auth.uid()));
create policy "artists update own" on public.artists for update to authenticated using (id = (select auth.uid()) or (select public.is_staff())) with check (id = (select auth.uid()) or (select public.is_staff()));

-- Artists may only move their own status draft -> submitted, call_invited -> call_booked, or withdraw.
-- Staff may set any status. Submitting requires accepted terms. Every change is logged.
create table public.status_events (
  id bigint generated always as identity primary key,
  artist_id uuid not null references public.artists(id) on delete cascade,
  from_status public.app_status, to_status public.app_status not null,
  changed_by uuid, created_at timestamptz not null default now()
);
alter table public.status_events enable row level security;
create policy "status history read" on public.status_events for select to authenticated using (artist_id = (select auth.uid()) or (select public.is_staff()));

create or replace function public.artists_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.email := old.email;
    if new.status is distinct from old.status then
      if not public.is_staff() then
        if not ((old.status = 'draft' and new.status = 'submitted')
             or (old.status = 'call_invited' and new.status = 'call_booked')
             or (new.status = 'withdrawn')) then
          raise exception 'Only the SOV team can change this status';
        end if;
      end if;
      if new.status = 'submitted' and new.terms_accepted_at is null then
        raise exception 'Please agree to the Terms of Use and Privacy Notice first';
      end if;
      if new.status = 'submitted' and new.submitted_at is null then new.submitted_at := now(); end if;
      insert into public.status_events(artist_id, from_status, to_status, changed_by) values (new.id, old.status, new.status, auth.uid());
    end if;
  else
    if not public.is_staff() then new.status := 'draft'; new.submitted_at := null; end if;
  end if;
  return new;
end $$;
create trigger artists_guard before insert or update on public.artists for each row execute function public.artists_guard();

-- Create the artist row automatically when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.artists (id, email, display_name, utm)
  values (new.id, new.email, nullif(new.raw_user_meta_data->>'display_name',''), case when new.raw_user_meta_data ? 'utm' and new.raw_user_meta_data->'utm' <> '{}'::jsonb then new.raw_user_meta_data->'utm' end)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.works (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  position smallint check (position between 1 and 6),
  title text, medium text, size text, year text,
  image_path text,
  created_at timestamptz not null default now(),
  unique (artist_id, position)
);
create index works_artist_idx on public.works(artist_id);
alter table public.works enable row level security;
create policy "works read" on public.works for select to authenticated using (artist_id = (select auth.uid()) or (select public.is_staff()));
create policy "works insert own" on public.works for insert to authenticated with check (artist_id = (select auth.uid()));
create policy "works update own" on public.works for update to authenticated using (artist_id = (select auth.uid())) with check (artist_id = (select auth.uid()));
create policy "works delete own" on public.works for delete to authenticated using (artist_id = (select auth.uid()));

create table public.consent_events (
  id bigint generated always as identity primary key,
  artist_id uuid not null references public.artists(id) on delete cascade,
  kind text not null, value text,
  created_at timestamptz not null default now()
);
create index consent_events_artist_idx on public.consent_events(artist_id);
alter table public.consent_events enable row level security;
create policy "consent read" on public.consent_events for select to authenticated using (artist_id = (select auth.uid()) or (select public.is_staff()));
create policy "consent add own" on public.consent_events for insert to authenticated with check (artist_id = (select auth.uid()));

create table public.review_notes (
  id bigint generated always as identity primary key,
  artist_id uuid not null references public.artists(id) on delete cascade,
  author uuid references auth.users(id) on delete set null,
  score_quality smallint check (score_quality between 1 and 5),
  score_professional smallint check (score_professional between 1 and 5),
  score_fit smallint check (score_fit between 1 and 5),
  note text,
  created_at timestamptz not null default now()
);
create index review_notes_artist_idx on public.review_notes(artist_id);
alter table public.review_notes enable row level security;
create policy "notes staff read" on public.review_notes for select to authenticated using ((select public.is_staff()));
create policy "notes staff add" on public.review_notes for insert to authenticated with check ((select public.is_staff()) and author = (select auth.uid()));

create index status_events_artist_idx on public.status_events(artist_id);

-- Private photo storage: each artist writes only inside a folder named with their user id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('artworks', 'artworks', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic']);

create policy "artworks read own or staff" on storage.objects for select to authenticated
  using (bucket_id = 'artworks' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_staff())));
create policy "artworks upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'artworks' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "artworks update own" on storage.objects for update to authenticated
  using (bucket_id = 'artworks' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "artworks delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'artworks' and (storage.foldername(name))[1] = (select auth.uid())::text);
