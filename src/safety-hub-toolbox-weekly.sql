-- ============================================================
-- TOOLBOX TALKS → WEEKLY GROUPS
-- Each week holds several documents (e.g. English, Spanish, two
-- Environmental topics). Confirmation happens ONCE per week, not
-- once per document.
-- ============================================================

create table toolbox_weeks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  week_label text not null,
  posted_at timestamptz default now()
);
alter table toolbox_weeks enable row level security;
create policy "toolbox weeks are public" on toolbox_weeks for select using (true);

-- Each talk now belongs to a week instead of standing alone.
alter table toolbox_talks add column week_id uuid references toolbox_weeks(id) on delete cascade;

-- Week-level acknowledgment (replaces per-talk acknowledgment).
create table toolbox_week_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references toolbox_weeks(id) on delete cascade,
  personnel_id uuid references personnel(id) on delete cascade,
  name text not null,
  employer text,
  acknowledged_at timestamptz default now(),
  unique (week_id, personnel_id)
);
alter table toolbox_week_acknowledgments enable row level security;

-- ------------------------------------------------------------
-- Confirm review of an entire week's set of documents at once.
-- ------------------------------------------------------------
create or replace function acknowledge_toolbox_week(
  p_token uuid,
  p_week_id uuid
) returns boolean
language plpgsql
security definer
as $$
declare
  v_personnel_id uuid;
  v_name text;
  v_employer text;
begin
  select p.id, p.name, p.employer into v_personnel_id, v_name, v_employer
  from sessions s join personnel p on p.id = s.personnel_id
  where s.token = p_token and s.expires_at > now();

  if v_personnel_id is null then
    return false;
  end if;

  insert into toolbox_week_acknowledgments (week_id, personnel_id, name, employer)
  values (p_week_id, v_personnel_id, v_name, v_employer)
  on conflict (week_id, personnel_id) do nothing;

  return true;
end;
$$;
grant execute on function acknowledge_toolbox_week(uuid, uuid) to anon;

create or replace function has_acknowledged_toolbox_week(
  p_token uuid,
  p_week_id uuid
) returns boolean
language plpgsql
security definer
as $$
declare
  v_personnel_id uuid;
  v_exists boolean;
begin
  select personnel_id into v_personnel_id from sessions where token = p_token and expires_at > now();
  if v_personnel_id is null then
    return false;
  end if;

  select exists(
    select 1 from toolbox_week_acknowledgments where week_id = p_week_id and personnel_id = v_personnel_id
  ) into v_exists;

  return v_exists;
end;
$$;
grant execute on function has_acknowledged_toolbox_week(uuid, uuid) to anon;

-- ------------------------------------------------------------
-- Admin: create a new week, add/edit/delete documents within it,
-- delete a whole week, and see who confirmed a given week.
-- ------------------------------------------------------------
create or replace function add_toolbox_week(
  p_token uuid,
  p_week_label text
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_project_id uuid;
  v_can_add boolean;
  v_new_id uuid;
begin
  select s.project_id, p.can_add_personnel into v_project_id, v_can_add
  from sessions s join personnel p on p.id = s.personnel_id
  where s.token = p_token and s.expires_at > now();

  if v_project_id is null or v_can_add is not true then
    return null;
  end if;

  insert into toolbox_weeks (project_id, week_label) values (v_project_id, p_week_label)
  returning id into v_new_id;

  return jsonb_build_object('id', v_new_id);
end;
$$;
grant execute on function add_toolbox_week(uuid, text) to anon;

create or replace function delete_toolbox_week(
  p_token uuid,
  p_week_id uuid
) returns boolean
language plpgsql
security definer
as $$
declare
  v_admin_project_id uuid;
  v_can_add boolean;
  v_target_project_id uuid;
begin
  select s.project_id, p.can_add_personnel into v_admin_project_id, v_can_add
  from sessions s join personnel p on p.id = s.personnel_id
  where s.token = p_token and s.expires_at > now();

  if v_admin_project_id is null or v_can_add is not true then
    return false;
  end if;

  select project_id into v_target_project_id from toolbox_weeks where id = p_week_id;
  if v_target_project_id is distinct from v_admin_project_id then
    return false;
  end if;

  delete from toolbox_weeks where id = p_week_id;
  return true;
end;
$$;
grant execute on function delete_toolbox_week(uuid, uuid) to anon;

-- Add a document to an existing week (admin's own project only).
create or replace function add_toolbox_talk_to_week(
  p_token uuid,
  p_week_id uuid,
  p_title text,
  p_doc_link text default null,
  p_video_link text default null
) returns boolean
language plpgsql
security definer
as $$
declare
  v_admin_project_id uuid;
  v_can_add boolean;
  v_week_project_id uuid;
begin
  select s.project_id, p.can_add_personnel into v_admin_project_id, v_can_add
  from sessions s join personnel p on p.id = s.personnel_id
  where s.token = p_token and s.expires_at > now();

  if v_admin_project_id is null or v_can_add is not true then
    return false;
  end if;

  select project_id into v_week_project_id from toolbox_weeks where id = p_week_id;
  if v_week_project_id is distinct from v_admin_project_id then
    return false;
  end if;

  insert into toolbox_talks (project_id, week_id, title, doc_link, video_link)
  values (v_admin_project_id, p_week_id, p_title, p_doc_link, p_video_link);
  return true;
end;
$$;
grant execute on function add_toolbox_talk_to_week(uuid, uuid, text, text, text) to anon;

create or replace function delete_toolbox_talk(
  p_token uuid,
  p_talk_id uuid
) returns boolean
language plpgsql
security definer
as $$
declare
  v_admin_project_id uuid;
  v_can_add boolean;
  v_target_project_id uuid;
begin
  select s.project_id, p.can_add_personnel into v_admin_project_id, v_can_add
  from sessions s join personnel p on p.id = s.personnel_id
  where s.token = p_token and s.expires_at > now();

  if v_admin_project_id is null or v_can_add is not true then
    return false;
  end if;

  select project_id into v_target_project_id from toolbox_talks where id = p_talk_id;
  if v_target_project_id is distinct from v_admin_project_id then
    return false;
  end if;

  delete from toolbox_talks where id = p_talk_id;
  return true;
end;
$$;

-- Admin: list all weeks (with their documents nested) for their project.
create or replace function list_toolbox_weeks_admin(p_token uuid) returns jsonb
language plpgsql
security definer
as $$
declare
  v_project_id uuid;
  v_can_add boolean;
  v_result jsonb;
begin
  select s.project_id, p.can_add_personnel into v_project_id, v_can_add
  from sessions s join personnel p on p.id = s.personnel_id
  where s.token = p_token and s.expires_at > now();

  if v_project_id is null or v_can_add is not true then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', w.id, 'week_label', w.week_label, 'posted_at', w.posted_at,
    'ack_count', (select count(*) from toolbox_week_acknowledgments a where a.week_id = w.id),
    'talks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', t.id, 'title', t.title, 'doc_link', t.doc_link, 'video_link', t.video_link
      )), '[]'::jsonb)
      from toolbox_talks t where t.week_id = w.id
    )
  ) order by w.posted_at desc), '[]'::jsonb)
  into v_result
  from toolbox_weeks w
  where w.project_id = v_project_id;

  return v_result;
end;
$$;
grant execute on function list_toolbox_weeks_admin(uuid) to anon;

create or replace function list_toolbox_week_acknowledgments(p_token uuid, p_week_id uuid) returns jsonb
language plpgsql
security definer
as $$
declare
  v_admin_project_id uuid;
  v_can_add boolean;
  v_target_project_id uuid;
  v_result jsonb;
begin
  select s.project_id, p.can_add_personnel into v_admin_project_id, v_can_add
  from sessions s join personnel p on p.id = s.personnel_id
  where s.token = p_token and s.expires_at > now();

  if v_admin_project_id is null or v_can_add is not true then
    return null;
  end if;

  select project_id into v_target_project_id from toolbox_weeks where id = p_week_id;
  if v_target_project_id is distinct from v_admin_project_id then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'name', a.name, 'employer', a.employer, 'acknowledged_at', a.acknowledged_at
  ) order by a.acknowledged_at desc), '[]'::jsonb)
  into v_result
  from toolbox_week_acknowledgments a
  where a.week_id = p_week_id;

  return v_result;
end;
$$;
grant execute on function list_toolbox_week_acknowledgments(uuid, uuid) to anon;
