-- ShopSense core schema (B3 draft).
--
-- STATUS: UNVERIFIED. Written before a Supabase project existed, so it has never
-- been run against real Postgres. Paste into the Supabase SQL editor once the
-- project is created, then fix whatever the editor complains about before
-- treating this comment as stale.
--
-- Design decisions this schema encodes, and why:
--   - Money is NUMERIC(12,2), never float. Floats cannot represent decimal
--     currency exactly (0.1 + 0.2 !== 0.3 in IEEE 754), so a float total would
--     drift from the true total after enough transactions — wrong on a receipt.
--   - stock_movements is append-only: every stock change (receipt, sale,
--     damage, correction) is a new row, never an UPDATE to a running quantity.
--     Current stock is SUM(quantity_delta). This means you can always answer
--     "how did stock get to this number", which a mutable quantity column
--     cannot, and it's what makes reconciliation possible at all.
--   - sale_items snapshots product_name and unit_price at sale time. If a
--     product's price changes tomorrow, a receipt printed today must still
--     show today's price — referencing the live products row would silently
--     rewrite history.
--   - reconciliations is immutable after insert (enforced by trigger, not just
--     "don't write UPDATE code for it") — a reconciliation is a legal record of
--     what was counted on a given day, and must not be quietly editable later.
--   - Multi-tenancy (shop_id on every table) is enforced at the application/
--     repository layer, per B5. This schema does not yet enable Row Level
--     Security — that's deliberately deferred to B5, once Supabase Auth exists
--     to provide the session context RLS would key off. Until then, every
--     query written against these tables MUST filter by shop_id by hand.

create extension if not exists pgcrypto;

-- ============================================================================
-- Shops and users
-- ============================================================================

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'GHS',
  created_at timestamptz not null default now()
);

-- One row per Supabase Auth user who has access to a shop. id mirrors
-- auth.users.id directly (not a separate generated key) so this table is a
-- profile/scoping extension of Supabase Auth, not a parallel identity system.
create table users (
  id uuid primary key references auth.users (id),
  shop_id uuid not null references shops (id),
  full_name text not null,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

create index idx_users_shop on users (shop_id);

-- ============================================================================
-- Categories and suppliers
-- ============================================================================

create table categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (shop_id, name)
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id),
  name text not null,
  contact_phone text,
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  created_at timestamptz not null default now()
);

create index idx_suppliers_shop on suppliers (shop_id);

-- ============================================================================
-- Products
-- ============================================================================

-- base_unit is the unit stock_movements are recorded in — always the smallest
-- unit the product is tracked in. units_per_carton, when set, is the
-- conversion factor letting the product also be received or sold by carton;
-- that conversion happens at the sale/receiving boundary, so the ledger itself
-- only ever deals in one unit per product and never has to reconcile two.
create table products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id),
  category_id uuid references categories (id),
  supplier_id uuid references suppliers (id),
  name text not null,
  sku text,
  base_unit text not null default 'piece' check (base_unit in ('piece', 'carton')),
  units_per_carton integer check (units_per_carton is null or units_per_carton > 0),
  cost_price numeric(12, 2) not null check (cost_price >= 0),
  selling_price numeric(12, 2) not null check (selling_price >= 0),
  reorder_threshold integer not null default 0 check (reorder_threshold >= 0),
  -- archived, never deleted: a deleted product would orphan every past sale
  -- line item and stock movement that references it, breaking receipt history.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_products_shop_sku on products (shop_id, sku) where sku is not null;
create index idx_products_shop on products (shop_id) where archived_at is null;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();

-- Price change history: populated by trigger rather than left to application
-- code remembering to write it, since a missed insert here silently breaks
-- reconciliation-dispute resolution (B3's stated reason for this table).
create table price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id),
  shop_id uuid not null references shops (id),
  old_cost_price numeric(12, 2) not null,
  new_cost_price numeric(12, 2) not null,
  old_selling_price numeric(12, 2) not null,
  new_selling_price numeric(12, 2) not null,
  changed_at timestamptz not null default now()
);

create index idx_price_history_product on price_history (product_id);

create or replace function log_price_change()
returns trigger as $$
begin
  if new.cost_price is distinct from old.cost_price
     or new.selling_price is distinct from old.selling_price then
    insert into price_history (
      product_id, shop_id, old_cost_price, new_cost_price, old_selling_price, new_selling_price
    ) values (
      old.id, old.shop_id, old.cost_price, new.cost_price, old.selling_price, new.selling_price
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_products_price_history
after update on products
for each row execute function log_price_change();

-- ============================================================================
-- Sales and sale items
-- ============================================================================

create table sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id),
  sold_by uuid references users (id),
  -- 'voided' is the only allowed post-hoc transition, and only via a
  -- dedicated endpoint — never a DELETE, never an UPDATE to totals.
  status text not null default 'completed' check (status in ('completed', 'voided')),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount_total numeric(12, 2) not null default 0 check (discount_total >= 0),
  grand_total numeric(12, 2) not null check (grand_total >= 0),
  -- Client-supplied key so a retried request (e.g. after offline sync) does
  -- not create a duplicate sale. Null for now until B7 wires idempotency up.
  idempotency_key text,
  created_at timestamptz not null default now()
);

create unique index idx_sales_shop_idempotency
  on sales (shop_id, idempotency_key) where idempotency_key is not null;
create index idx_sales_shop_created on sales (shop_id, created_at);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id),
  product_id uuid not null references products (id),
  -- Snapshots: a receipt must read the same way years later even if the
  -- product was renamed, archived, or repriced since. Never join to the live
  -- products row to render a past receipt.
  product_name_snapshot text not null,
  unit text not null check (unit in ('piece', 'carton')),
  quantity integer not null check (quantity > 0),
  unit_price_snapshot numeric(12, 2) not null check (unit_price_snapshot >= 0),
  line_subtotal numeric(12, 2) not null check (line_subtotal >= 0),
  created_at timestamptz not null default now()
);

create index idx_sale_items_sale on sale_items (sale_id);
create index idx_sale_items_product on sale_items (product_id);

-- Discount ledger: one row per discount actually applied, at either sale
-- level (sale_item_id null) or line level. Kept separate from sales/sale_items
-- columns so B8's reconciliation can attribute variance to specific discounts
-- rather than only seeing an aggregate discount_total.
create table discounts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id),
  sale_id uuid not null references sales (id),
  sale_item_id uuid references sale_items (id),
  discount_type text not null check (discount_type in ('percentage', 'fixed_amount')),
  -- Interpreted per discount_type: a percentage (e.g. 10.00 for 10%) or a
  -- money amount. Two meanings sharing one column is a compromise; the `amount`
  -- column below is what actually matters for accounting, since it's the
  -- money value already resolved and snapshotted regardless of type.
  discount_value numeric(12, 4) not null,
  amount numeric(12, 2) not null check (amount >= 0),
  reason text,
  applied_by uuid references users (id),
  created_at timestamptz not null default now()
);

create index idx_discounts_sale on discounts (sale_id);

-- ============================================================================
-- Stock movements (append-only ledger)
-- ============================================================================

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id),
  product_id uuid not null references products (id),
  movement_type text not null check (
    movement_type in ('receipt', 'sale', 'adjustment_damage', 'adjustment_loss', 'adjustment_correction')
  ),
  -- Signed, in the product's base_unit. Positive = stock in, negative = stock
  -- out. Current stock is derived as SUM(quantity_delta), never stored.
  quantity_delta integer not null check (quantity_delta <> 0),
  unit_cost numeric(12, 2),
  reference_sale_id uuid references sales (id),
  reason text,
  recorded_by uuid references users (id),
  created_at timestamptz not null default now(),
  constraint chk_adjustment_requires_reason check (
    movement_type not like 'adjustment_%' or reason is not null
  )
);

create index idx_stock_movements_shop_product on stock_movements (shop_id, product_id);
create index idx_stock_movements_product_created on stock_movements (product_id, created_at);

-- Append-only in practice, not just in intent: block UPDATE/DELETE outright,
-- since a mutated or deleted movement is indistinguishable from data loss and
-- would invalidate every reconciliation computed since.
create or replace function forbid_ledger_mutation()
returns trigger as $$
begin
  raise exception 'stock_movements is append-only: % is not permitted', tg_op;
end;
$$ language plpgsql;

create trigger trg_stock_movements_no_update
before update on stock_movements
for each row execute function forbid_ledger_mutation();

create trigger trg_stock_movements_no_delete
before delete on stock_movements
for each row execute function forbid_ledger_mutation();

-- ============================================================================
-- Reconciliations
-- ============================================================================

create table reconciliations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id),
  business_date date not null,
  expected_cash numeric(12, 2) not null,
  counted_cash numeric(12, 2) not null,
  -- Stored, not recomputed on read: expected_cash is a point-in-time
  -- aggregate over sales up to submission time, and must not silently drift
  -- if later corrections touch that day's sales.
  variance numeric(12, 2) not null,
  variance_cause text check (
    variance_cause in ('discount_driven', 'unrecorded_sale', 'counting_error', 'unexplained')
  ),
  notes text,
  submitted_by uuid references users (id),
  submitted_at timestamptz not null default now(),
  unique (shop_id, business_date)
);

create index idx_reconciliations_shop_date on reconciliations (shop_id, business_date);

create or replace function forbid_reconciliation_mutation()
returns trigger as $$
begin
  raise exception 'reconciliations is immutable once submitted: % is not permitted', tg_op;
end;
$$ language plpgsql;

create trigger trg_reconciliations_no_update
before update on reconciliations
for each row execute function forbid_reconciliation_mutation();

create trigger trg_reconciliations_no_delete
before delete on reconciliations
for each row execute function forbid_reconciliation_mutation();
