drop function if exists public.create_user_organization_if_needed;
create or replace function public.create_user_organization_if_needed
(
  email text,
  name text,
  image text,
  org_name text,
  wallet_addr text,
  roles text[] default null,
  org_address jsonb default null,
  updates boolean default false
) returns organization as $$
declare
  v_user "user";
  v_org organization;
begin
  v_user := public.really_create_user_if_needed
(email, name, image, null, roles, null, wallet_addr, updates);
  v_org := public.really_create_organization_if_needed
(org_name, org_name, wallet_addr, v_user.id, image, null, roles, org_address);

return v_org;
end;
$$ language plpgsql volatile 
set search_path
= pg_catalog, public, pg_temp;

drop function if exists public.create_user_organization;
create or replace function public.create_user_organization(
  email text,
  name text,
  image text,
  org_name text,
  wallet_addr text,
  roles text[] default null,
  org_address jsonb default null
) returns organization as $$
declare
  v_user "user";
  v_org organization;
begin
  v_user := public.really_create_user
    (email, name, image, null, roles, null, null, false);
  v_org := public.really_create_organization
    (org_name, org_name, wallet_addr, v_user.id, image, null, roles, org_address);

  return v_org;
end;
$$ language plpgsql volatile
set search_path = pg_catalog, public, pg_temp;

-- TODO: Update to use address table instead of location
create or replace function private.really_create_project(
  methodology_developer_id uuid,
  project_developer_id uuid,
  land_steward_id uuid,
  name text,
  application_date timestamptz,
  start_date timestamptz,
  end_date timestamptz,
  summary_description char(160),
  long_description text,
  image text,
  area integer,
  area_unit char(10),
  state project_state
) returns project as $$
declare
  v_methodology methodology;
  v_credit_class credit_class;
  v_project project;
begin
  -- Insert new methodology
  insert into methodology
    (author_id)
  values
    (methodology_developer_id)
  returning * into v_methodology;

  -- Insert new credit class with this methodology
  insert into credit_class
    (methodology_id)
  values
    (v_methodology.id)
  returning * into v_credit_class;

  -- Insert new project with this credit class
  insert into project (developer_id, steward_id, credit_class_id, name, application_date, start_date, end_date, summary_description, long_description, image, area, area_unit, state)
  values (project_developer_id, land_steward_id, v_credit_class.id, name, application_date, start_date, end_date, summary_description, long_description, image, area, area_unit, state)
  returning * into v_project;

  return v_project;
end;
$$ language plpgsql volatile
set search_path = pg_catalog, public, pg_temp;
