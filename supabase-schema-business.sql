-- Business accounts: organizations, members, invites, and the project room (shortlist, budget, milestones, documents, feedback).

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  sector text check (length(sector) <= 80),
  city text check (length(city) <= 120),
  country text check (length(country) <= 80),
  website text check (length(website) <= 300),
  billing_email text check (length(billing_email) <= 254),
  vendor_portal text check (length(vendor_portal) <= 300),
  payment_terms text check (length(payment_terms) <= 80),
  approvers text check (length(approvers) <= 1000),
  notes text check (length(notes) <= 2000),
  created_at timestamptz not null default now()
);
alter table public.orgs enable row level security;

create table public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  name text, title text,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.org_members(user_id);
alter table public.org_members enable row level security;

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index org_invites_email_idx on public.org_invites(lower(email));
alter table public.org_invites enable row level security;

create or replace function public.is_org_member(o uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members where org_id = o and user_id = auth.uid());
$$;
create or replace function public.is_org_owner(o uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members where org_id = o and user_id = auth.uid() and role = 'owner');
$$;
revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.is_org_owner(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_owner(uuid) to authenticated;

create policy "orgs read" on public.orgs for select to authenticated using ((select public.is_org_member(id)) or (select public.is_staff()));
create policy "orgs update" on public.orgs for update to authenticated using ((select public.is_org_owner(id)) or (select public.is_staff())) with check ((select public.is_org_owner(id)) or (select public.is_staff()));
create policy "members read" on public.org_members for select to authenticated using ((select public.is_org_member(org_id)) or (select public.is_staff()));
create policy "members update self" on public.org_members for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members remove" on public.org_members for delete to authenticated using (((select public.is_org_owner(org_id)) and user_id <> (select auth.uid())) or (select public.is_staff()));
create policy "invites read" on public.org_invites for select to authenticated using ((select public.is_org_member(org_id)) or (select public.is_staff()));
create policy "invites add" on public.org_invites for insert to authenticated with check (((select public.is_org_owner(org_id)) or (select public.is_staff())) and invited_by = (select auth.uid()) and accepted_at is null);
create policy "invites remove" on public.org_invites for delete to authenticated using ((select public.is_org_owner(org_id)) or (select public.is_staff()));

-- Members cannot change their own role.
create or replace function public.org_members_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and not public.is_staff() then
    new.role := old.role; new.org_id := old.org_id; new.user_id := old.user_id;
  end if;
  return new;
end $$;
create trigger org_members_guard before update on public.org_members for each row execute function public.org_members_guard();

-- Briefs now belong to an organization and move through visible stages.
alter table public.briefs add column org_id uuid references public.orgs(id) on delete set null;
alter table public.briefs add column created_by uuid references auth.users(id) on delete set null;
alter table public.briefs add column stage text not null default 'brief' check (stage in ('brief','shortlist','concept','scope','make','install','complete','paused'));
alter table public.briefs add column title text check (length(title) <= 200);
create index briefs_org_idx on public.briefs(org_id);
alter policy "anyone can send a brief" on public.briefs
  with check (status = 'new' and stage = 'brief' and cardinality(outcomes) <= 20 and cardinality(creative_types) <= 20 and cardinality(constraints) <= 20
    and ((org_id is null and created_by is null) or (created_by = (select auth.uid()) and (org_id is null or (select public.is_org_member(org_id))))));
create policy "members read briefs" on public.briefs for select to authenticated using (org_id is not null and (select public.is_org_member(org_id)));

create or replace function public.brief_member(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.briefs br join public.org_members m on m.org_id = br.org_id where br.id = b and m.user_id = auth.uid());
$$;
revoke all on function public.brief_member(uuid) from public, anon;
grant execute on function public.brief_member(uuid) to authenticated;

-- Shortlist: creatives the team proposes for a brief.
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  reason text check (length(reason) <= 1000),
  fee_range text check (length(fee_range) <= 80),
  status text not null default 'proposed' check (status in ('draft','proposed','concept_requested','selected','declined')),
  created_at timestamptz not null default now(),
  unique (brief_id, artist_id)
);
create index matches_brief_idx on public.matches(brief_id);
create index matches_artist_idx on public.matches(artist_id);
alter table public.matches enable row level security;
create policy "matches read" on public.matches for select to authenticated using ((select public.is_staff()) or (status <> 'draft' and (select public.brief_member(brief_id))));
create policy "matches staff write" on public.matches for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- Line-item budget, every cost on its own line.
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs(id) on delete cascade,
  category text not null check (category in ('creative_fee','materials','fabrication','shipping','install','permits','insurance','documentation','sov_fee','other')),
  label text not null check (length(label) <= 200),
  amount numeric(12,2) not null check (amount >= 0),
  note text check (length(note) <= 400),
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index budget_lines_brief_idx on public.budget_lines(brief_id);
alter table public.budget_lines enable row level security;
create policy "budget read" on public.budget_lines for select to authenticated using ((select public.is_staff()) or (select public.brief_member(brief_id)));
create policy "budget staff write" on public.budget_lines for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- Milestones: money moves only after the client approves.
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs(id) on delete cascade,
  title text not null check (length(title) <= 200),
  detail text check (length(detail) <= 1000),
  amount numeric(12,2) check (amount is null or amount >= 0),
  due_date date,
  status text not null default 'upcoming' check (status in ('upcoming','ready','approved','paid')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);
create index milestones_brief_idx on public.milestones(brief_id);
alter table public.milestones enable row level security;
create policy "milestones read" on public.milestones for select to authenticated using ((select public.is_staff()) or (select public.brief_member(brief_id)));
create policy "milestones staff write" on public.milestones for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- Documents: COI, W-9, scope, contract, invoices, closeout (links the team adds).
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references public.briefs(id) on delete cascade,
  org_id uuid references public.orgs(id) on delete cascade,
  kind text not null check (kind in ('scope','contract','coi','w9','invoice','concept','permit','closeout','report','other')),
  title text not null check (length(title) <= 200),
  url text not null check (url ~ '^https://' and length(url) <= 800),
  created_at timestamptz not null default now(),
  check (brief_id is not null or org_id is not null)
);
create index documents_brief_idx on public.documents(brief_id);
alter table public.documents enable row level security;
create policy "documents read" on public.documents for select to authenticated using ((select public.is_staff()) or (brief_id is not null and (select public.brief_member(brief_id))) or (org_id is not null and (select public.is_org_member(org_id))));
create policy "documents staff write" on public.documents for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));

-- Feedback in the shared language: see, hear, feel, think, experience.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid not null references public.briefs(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  lens text not null check (lens in ('see','hear','feel','think','experience','note')),
  body text not null check (length(body) between 1 and 2000),
  author uuid not null references auth.users(id) on delete cascade,
  author_name text check (length(author_name) <= 120),
  created_at timestamptz not null default now()
);
create index feedback_brief_idx on public.feedback(brief_id);
alter table public.feedback enable row level security;
create policy "feedback read" on public.feedback for select to authenticated using ((select public.is_staff()) or (select public.brief_member(brief_id)));
create policy "feedback add" on public.feedback for insert to authenticated with check (author = (select auth.uid()) and ((select public.is_staff()) or (select public.brief_member(brief_id))));

-- Client actions, checked in one place.
create or replace function public.approve_milestone(m uuid) returns void
language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  select brief_id into b from public.milestones where id = m and status = 'ready';
  if b is null then raise exception 'This milestone is not ready for approval'; end if;
  if not (public.brief_member(b) or public.is_staff()) then raise exception 'Not allowed'; end if;
  update public.milestones set status = 'approved', approved_by = auth.uid(), approved_at = now() where id = m;
end $$;
create or replace function public.choose_match(m uuid, choice text) returns void
language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  if choice not in ('concept_requested','selected','declined') then raise exception 'Unknown choice'; end if;
  select brief_id into b from public.matches where id = m and status <> 'draft';
  if b is null or not (public.brief_member(b) or public.is_staff()) then raise exception 'Not allowed'; end if;
  update public.matches set status = choice where id = m;
end $$;
revoke all on function public.approve_milestone(uuid) from public, anon;
revoke all on function public.choose_match(uuid, text) from public, anon;
grant execute on function public.approve_milestone(uuid) to authenticated;
grant execute on function public.choose_match(uuid, text) to authenticated;

-- What a business may see about a matched creative: their public-facing work, never contact details.
create or replace function public.match_cards(b uuid)
returns table (match_id uuid, status text, reason text, fee_range text, display_name text, creative_field text, city text, disciplines text[], bio text, works jsonb)
language sql stable security definer set search_path = public as $$
  select m.id, m.status, m.reason, m.fee_range, a.display_name, a.creative_field, a.city_state, a.disciplines, a.bio,
    coalesce((select jsonb_agg(jsonb_build_object('title', w.title, 'medium', w.medium, 'size', w.size, 'year', w.year, 'image_path', w.image_path, 'link_url', w.link_url, 'kind', w.kind) order by w.position nulls last, w.created_at)
              from public.works w where w.artist_id = a.id), '[]'::jsonb)
  from public.matches m join public.artists a on a.id = m.artist_id
  where m.brief_id = b and m.status <> 'draft' and (public.brief_member(b) or public.is_staff())
  order by m.created_at;
$$;
revoke all on function public.match_cards(uuid) from public, anon;
grant execute on function public.match_cards(uuid) to authenticated;

-- Businesses may view photos of creatives shortlisted for their briefs.
create policy "artworks read for matched businesses" on storage.objects for select to authenticated
  using (bucket_id = 'artworks' and exists (
    select 1 from public.matches m join public.briefs br on br.id = m.brief_id join public.org_members om on om.org_id = br.org_id
    where om.user_id = (select auth.uid()) and m.status <> 'draft' and m.artist_id::text = (storage.foldername(name))[1]));

-- Sign-up: businesses get an organization (or join one they were invited to); creatives get an artist row.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid; inv record;
begin
  if coalesce(new.raw_user_meta_data->>'account_type', 'creative') = 'business' then
    select * into inv from public.org_invites where lower(email) = lower(new.email) and accepted_at is null order by created_at limit 1;
    if inv.id is not null then
      o := inv.org_id;
      update public.org_invites set accepted_at = now() where lower(email) = lower(new.email) and org_id = o and accepted_at is null;
      insert into public.org_members(org_id, user_id, role, name, title) values (o, new.id, 'member', nullif(new.raw_user_meta_data->>'display_name',''), nullif(new.raw_user_meta_data->>'title',''));
    else
      insert into public.orgs(name, sector) values (coalesce(nullif(new.raw_user_meta_data->>'org_name',''), 'My organization'), nullif(new.raw_user_meta_data->>'sector','')) returning id into o;
      insert into public.org_members(org_id, user_id, role, name, title) values (o, new.id, 'owner', nullif(new.raw_user_meta_data->>'display_name',''), nullif(new.raw_user_meta_data->>'title',''));
    end if;
    -- Briefs they already sent from the website with this email join their account.
    update public.briefs set org_id = o where org_id is null and lower(email) = lower(new.email);
  else
    insert into public.artists (id, email, display_name, utm)
    values (new.id, new.email, nullif(new.raw_user_meta_data->>'display_name',''), case when new.raw_user_meta_data ? 'utm' and new.raw_user_meta_data->'utm' <> '{}'::jsonb then new.raw_user_meta_data->'utm' end)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.org_members_guard() from public, anon, authenticated;

-- Someone who already has an account can accept a pending invite after logging in.
create or replace function public.accept_invites() returns int
language plpgsql security definer set search_path = public as $$
declare e text; n int := 0; r record;
begin
  select email into e from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if e is null then return 0; end if;
  for r in select * from public.org_invites where lower(email) = lower(e) and accepted_at is null loop
    insert into public.org_members(org_id, user_id, role) values (r.org_id, auth.uid(), 'member') on conflict do nothing;
    update public.org_invites set accepted_at = now() where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.accept_invites() from public, anon;
grant execute on function public.accept_invites() to authenticated;

-- Collection: every finished work the organization owns or has on loan, with where it hangs and how to care for it.
create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  brief_id uuid references public.briefs(id) on delete set null,
  title text not null check (length(title) <= 200),
  creative_name text check (length(creative_name) <= 200),
  medium text check (length(medium) <= 200),
  size text check (length(size) <= 120),
  year text check (length(year) <= 12),
  location text check (length(location) <= 200),
  ownership text not null default 'owned' check (ownership in ('owned','on_loan','rotation','licensed')),
  value numeric(12,2) check (value is null or value >= 0),
  image_url text check (image_url is null or (image_url ~ '^https://' and length(image_url) <= 800)),
  care text check (length(care) <= 1000),
  rights text check (length(rights) <= 1000),
  installed_on date,
  next_rotation date,
  created_at timestamptz not null default now()
);
create index collection_org_idx on public.collection_items(org_id);
alter table public.collection_items enable row level security;
create policy "collection read" on public.collection_items for select to authenticated using ((select public.is_staff()) or (select public.is_org_member(org_id)));
create policy "collection staff write" on public.collection_items for all to authenticated using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "staff write orgs" on public.orgs for insert to authenticated with check ((select public.is_staff()));
create policy "staff add members" on public.org_members for insert to authenticated with check ((select public.is_staff()));
create index feedback_match_idx on public.feedback(match_id);
create index documents_org_idx on public.documents(org_id);
create index milestones_approved_by_idx on public.milestones(approved_by);
create index org_invites_org_idx on public.org_invites(org_id);
create index org_invites_by_idx on public.org_invites(invited_by);
create index feedback_author_idx on public.feedback(author);
create index briefs_created_by_idx on public.briefs(created_by);
create index collection_brief_idx on public.collection_items(brief_id);
alter table public.briefs add column if not exists approvals text[] not null default '{}', add column if not exists approvals_detail text, add column if not exists building_age text;
alter table public.briefs add column if not exists engagement_mode text, add column if not exists byo_creative text, add column if not exists byo_contact text, add column if not exists feeling text, add column if not exists approver text, add column if not exists usage_rights text[] not null default '{}';
alter table public.artists add column if not exists licensing text[] not null default '{}', add column if not exists ai_process text, add column if not exists languages text;
-- contact messages (Talk with us page)
create table if not exists public.contact_messages (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), name text not null, email text not null, org text, phone text, topic text not null default 'general', message text not null, page text, status text not null default 'new' check (status in ('new','replied','archived')));
alter table public.contact_messages enable row level security;
-- policies: anyone can insert with status 'new'; staff (is_staff()) can select and update.
-- Oct 17: self-serve opportunities + applications (tier 1), program fields on briefs (tier 3).
-- See migration opportunities_applications_programs: tables opportunities, applications; functions is_approved_creative, opp_org_member, opp_open, opp_applicants;
-- RLS: org members create/edit (cannot self-open; SOV staff opens), approved creatives read open network postings and apply, org members review applicants.
-- briefs.program_sites int, briefs.program_cadence text. Storage: artworks readable by orgs where the creative applied.
