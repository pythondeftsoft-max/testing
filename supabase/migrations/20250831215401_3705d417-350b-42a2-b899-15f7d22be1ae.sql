
-- Phase 0: RBAC audit fixes — add missing RPCs and safe policies

-- 1) Create has_portfolio_permission(user, portfolio, object, action) -> boolean
--    Admin/owner and portfolio admin override, else resolve via portfolio_role_permissions
create or replace function public.has_portfolio_permission(
  p_user_id uuid,
  p_portfolio_id uuid,
  p_object text,
  p_action text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      -- Global account override and portfolio admin override
      when is_admin(p_user_id)
        or has_account_role(p_user_id, array['owner'::account_role_type, 'admin_partner'::account_role_type])
        or has_portfolio_role(p_portfolio_id, p_user_id, array['admin_partner'::portfolio_role_type])
      then true

      else coalesce((
        select case
          when p_action = 'view'   then prp.can_view
          when p_action = 'edit'   then prp.can_edit
          when p_action = 'delete' then prp.can_delete
          when p_action = 'create' then prp.can_create
          else false
        end
        from public.portfolio_roles r
        join public.permission_objects po
          on po.scope = 'portfolio'
         and po.name = p_object
         and po.is_active = true
        join public.portfolio_role_permissions prp
          on prp.role_name = r.role_name
         and prp.permission_object_id = po.id
        where r.portfolio_id = p_portfolio_id
          and r.user_id      = p_user_id
          and r.is_active    = true
        order by case r.role_name
          when 'admin_partner' then 1
          when 'editor'        then 2
          when 'viewer'        then 3
          when 'maintenance'   then 4
          else 5
        end
        limit 1
      ), false)
    end;
$$;

comment on function public.has_portfolio_permission(uuid, uuid, text, text)
  is 'Returns true if the user has the requested action on the portfolio permission object, with admin overrides.';


-- 2) Create get_portfolio_role_permissions(role) -> permission grid payload
create or replace function public.get_portfolio_role_permissions(
  p_role public.portfolio_role_type
)
returns table (
  object_name text,
  display_name text,
  category text,
  description text,
  can_view boolean,
  can_edit boolean,
  can_delete boolean,
  can_create boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    po.name         as object_name,
    po.display_name,
    po.category,
    po.description,
    coalesce(prp.can_view,   false) as can_view,
    coalesce(prp.can_edit,   false) as can_edit,
    coalesce(prp.can_delete, false) as can_delete,
    coalesce(prp.can_create, false) as can_create
  from public.permission_objects po
  left join public.portfolio_role_permissions prp
    on prp.permission_object_id = po.id
   and prp.role_name = p_role
  where po.scope = 'portfolio'
    and po.is_active = true
  order by po.category, po.sort_order, po.display_name;
$$;

comment on function public.get_portfolio_role_permissions(public.portfolio_role_type)
  is 'Returns the permission grid for a portfolio role across all portfolio-scoped permission objects.';


-- 3) RLS: allow account owners/admin_partners to manage portfolio_role_permissions globally
alter table public.portfolio_role_permissions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'portfolio_role_permissions'
      and policyname = 'Admins can manage portfolio role permissions'
  ) then
    create policy "Admins can manage portfolio role permissions"
      on public.portfolio_role_permissions
      for all
      using (has_account_role(auth.uid(), array['owner'::account_role_type, 'admin_partner'::account_role_type]))
      with check (has_account_role(auth.uid(), array['owner'::account_role_type, 'admin_partner'::account_role_type]));
  end if;
end$$;


-- 4) Data integrity and performance
-- Ensure uniqueness of permission object names per scope
create unique index if not exists permission_objects_unique_scope_name
  on public.permission_objects (scope, name);

-- Ensure each role/object pair is unique
create unique index if not exists portfolio_role_permissions_unique_role_object
  on public.portfolio_role_permissions (role_name, permission_object_id);
