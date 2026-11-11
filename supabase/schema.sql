begin;

create table if not exists public.yarn_inventory (
  collection text not null,
  position integer not null check (position > 0),
  name text not null,
  color_code text,
  image text not null,
  stock numeric not null check (stock >= 0 and stock < 'Infinity'::numeric),
  primary key (collection, position)
);

alter table public.yarn_inventory enable row level security;

revoke all on public.yarn_inventory from public, anon, authenticated;
grant select on public.yarn_inventory to anon, authenticated;
grant update (stock) on public.yarn_inventory to authenticated;

drop policy if exists "Public inventory" on public.yarn_inventory;
create policy "Public inventory"
  on public.yarn_inventory for select to anon, authenticated
  using (true);

drop policy if exists "Owner updates stock" on public.yarn_inventory;
create policy "Owner updates stock"
  on public.yarn_inventory for update to authenticated
  using ((select auth.jwt()) -> 'app_metadata' -> 'yarn_inventory_owner' = 'true'::jsonb)
  with check ((select auth.jwt()) -> 'app_metadata' -> 'yarn_inventory_owner' = 'true'::jsonb);

commit;
