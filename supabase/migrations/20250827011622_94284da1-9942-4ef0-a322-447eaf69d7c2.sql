
-- 1) Ensure the modern real_estate category is active
update asset_categories
set is_active = true
where name = 'real_estate';

-- 2) Add missing subcategories to real_estate (idempotent append)
-- This appends only those not already present.
update asset_categories ac
set subcategories = (
  coalesce(ac.subcategories::jsonb, '[]'::jsonb)
  ||
  coalesce((
    select jsonb_agg(candidate)
    from (
      values
        (jsonb_build_object('value','marina','label','Marina')),
        (jsonb_build_object('value','medical','label','Medical Facility')),
        (jsonb_build_object('value','shopping_center','label','Shopping Center')),
        (jsonb_build_object('value','office_building','label','Office Building')),
        (jsonb_build_object('value','warehouse_distribution','label','Warehouse/Distribution')),
        (jsonb_build_object('value','manufacturing','label','Manufacturing')),
        (jsonb_build_object('value','flex_space','label','Flex Space')),
        (jsonb_build_object('value','golf_course','label','Golf Course')),
        (jsonb_build_object('value','prison','label','Correctional Facility')),
        (jsonb_build_object('value','restaurant','label','Restaurant')),
        (jsonb_build_object('value','motel','label','Motel'))
    ) as t(candidate)
    where not exists (
      select 1
      from jsonb_array_elements(coalesce(ac.subcategories::jsonb,'[]'::jsonb)) e
      where e->>'value' = t.candidate->>'value'
    )
  ), '[]'::jsonb)
)::json
where ac.name = 'real_estate';

-- 3) Optional: remove the duplicate Real Estate card (legacy 'property' category)
-- If you rely on 'property' elsewhere, skip this line.
update asset_categories
set is_active = false
where name = 'property';
