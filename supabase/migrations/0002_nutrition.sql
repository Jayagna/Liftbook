-- Which meal of the day a logged food belongs to. Null for older and imported entries.
alter table public.food_entries
  add column slot text check (slot in ('breakfast', 'lunch', 'dinner', 'snack'));

-- Supplements that come as tablets or capsules.
alter table public.supplement_products drop constraint supplement_products_unit_check;
alter table public.supplement_products add constraint supplement_products_unit_check check (unit in ('scoop', 'g', 'tablet'));
