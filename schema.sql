-- NoteMate Database Schema Setup
-- Execute this SQL script in the Supabase SQL Editor.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (Extends Supabase Auth users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('customer', 'writer', 'admin')),
  verified boolean not null default false,
  email_verified boolean not null default false,
  writer_status text not null default 'pending' check (writer_status in ('pending', 'approved', 'rejected')),
  avatar_url text,
  college_id_key text,
  phone text default '',
  bio text default '',
  available_balance numeric not null default 0.0,
  rating numeric not null default 0.0,
  rating_count integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles
  add column if not exists phone text default '',
  add column if not exists bio text default '',
  add column if not exists email_verified boolean not null default false;

-- Enable RLS on Profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Allow public read access to profiles" on public.profiles
  for select using (true);

create policy "Allow authenticated users to insert profiles" on public.profiles
  for insert with check (auth.role() = 'authenticated');

create policy "Allow users to update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Writer Applications Table
create table if not exists public.writer_applications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  full_name text not null,
  email text not null,
  phone text not null,
  college text not null,
  department text not null,
  semester text not null,
  skills text not null,
  experience text not null,
  upi_id text not null,
  portfolio_url text,
  bio text not null,
  profile_image text,
  college_id_image text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.writer_applications enable row level security;

create policy "Allow authenticated users to insert writer applications" on public.writer_applications
  for insert with check (auth.role() = 'authenticated');

create policy "Allow owners to read their applications" on public.writer_applications
  for select using (auth.uid() = user_id);

create policy "Allow admins to read all writer applications" on public.writer_applications
  for select using (true);

create policy "Allow authenticated users to update their own writer applications" on public.writer_applications
  for update using (auth.uid() = user_id);

create policy "Allow admins to delete writer applications" on public.writer_applications
  for delete using (true);

-- Trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, verified, writer_status, avatar_url, college_id_key, phone, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    case when coalesce(new.raw_user_meta_data->>'role', 'customer') = 'writer' then false else true end,
    case when coalesce(new.raw_user_meta_data->>'role', 'customer') = 'writer' then 'pending' else 'approved' end,
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'college_id_key',
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'bio', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Recreate trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Assignments Table (Extending existing columns)
create table if not exists public.assignments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  writer_id uuid references auth.users on delete set null,
  title text not null,
  subject text not null,
  description text,
  budget numeric not null check (budget >= 0),
  pages integer not null check (pages > 0),
  deadline date not null,
  file_url text, -- single file legacy field
  file_keys text[] default '{}'::text[], -- multiple files support
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'In Progress', 'Ready', 'Completed', 'Cancelled', 'Disputed')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'held', 'released', 'refunded')),
  urgency text not null default 'normal' check (urgency in ('normal', 'urgent', 'express')),
  delivery_mode text not null default 'digital' check (delivery_mode in ('digital', 'physical')),
  subject_type text not null default 'standard' check (subject_type in ('standard', 'technical', 'diagram-heavy')),
  proof_keys text[] default '{}'::text[],
  final_proof_keys text[] default '{}'::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  accepted_at timestamp with time zone,
  completed_at timestamp with time zone,
  delivered_at timestamp with time zone
);

-- Enable RLS on Assignments
alter table public.assignments enable row level security;

-- Assignments Policies
create policy "Allow all users to read active assignments" on public.assignments
  for select using (true);

create policy "Allow customers to create assignments" on public.assignments
  for insert with check (auth.role() = 'authenticated');

create policy "Allow updates by owners or assigned writers" on public.assignments
  for update using (
    auth.role() = 'authenticated'
  );

create policy "Allow owners to delete pending assignments" on public.assignments
  for delete using (auth.uid() = user_id and status = 'Pending');


-- 3. Messages Table (Real-time chat)
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments on delete cascade not null,
  sender_id uuid references auth.users on delete cascade not null,
  text text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Messages
alter table public.messages enable row level security;

create policy "Allow chat participants to read messages" on public.messages
  for select using (auth.role() = 'authenticated');

create policy "Allow chat participants to insert messages" on public.messages
  for insert with check (auth.role() = 'authenticated');


-- 4. Reviews Table
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments on delete cascade not null,
  reviewer_id uuid references auth.users on delete cascade not null,
  reviewee_id uuid references auth.users on delete cascade not null,
  rating_overall integer not null check (rating_overall between 1 and 5),
  rating_handwriting integer not null check (rating_handwriting between 1 and 5),
  rating_speed integer not null check (rating_speed between 1 and 5),
  rating_accuracy integer not null check (rating_accuracy between 1 and 5),
  review text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Reviews
alter table public.reviews enable row level security;

create policy "Allow read access to reviews" on public.reviews
  for select using (true);

create policy "Allow customers to review writers" on public.reviews
  for insert with check (auth.role() = 'authenticated');


-- 5. Payments Table
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric not null,
  type text not null check (type in ('payment', 'payout', 'refund')),
  status text not null check (status in ('pending', 'success', 'failed')),
  razorpay_order_id text,
  razorpay_payment_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Payments
alter table public.payments enable row level security;

create policy "Allow users to read their own payments" on public.payments
  for select using (auth.role() = 'authenticated');

create policy "Allow inserting payment records" on public.payments
  for insert with check (auth.role() = 'authenticated');

create table if not exists public.platform_commissions (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments on delete cascade not null,
  amount numeric not null,
  commission_rate numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.platform_commissions enable row level security;

create policy "Allow admins to read platform commissions" on public.platform_commissions
  for select using (public.current_user_role() = 'admin');

create policy "Allow admins to insert platform commissions" on public.platform_commissions
  for insert with check (public.current_user_role() = 'admin');

create policy "Allow authenticated users to insert platform commissions" on public.platform_commissions
  for insert with check (
    auth.role() = 'authenticated' AND
    amount >= 0 AND
    commission_rate >= 0 AND
    commission_rate <= 1
  );


-- 6. Notifications Table
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Notifications
alter table public.notifications enable row level security;

create policy "Allow users to read their own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Allow users to update their own notifications" on public.notifications
  for update using (auth.uid() = user_id);

create policy "Allow system notifications insertion" on public.notifications
  for insert with check (auth.role() = 'authenticated' or true);


-- 7. Commission Config Table
create table if not exists public.commission_config (
  key text primary key,
  value numeric not null
);

-- Enable RLS on Commission Config
alter table public.commission_config enable row level security;

create policy "Allow read access to config" on public.commission_config
  for select using (true);

create policy "Allow write access to config for admins" on public.commission_config
  for all using (true); -- simplified policy for app compatibility

-- Seed basic commission config
insert into public.commission_config (key, value) values
  ('BASE_RATE_PER_PAGE', 12.0),
  ('URGENCY_NORMAL', 1.0),
  ('URGENCY_URGENT', 1.4),
  ('URGENCY_EXPRESS', 1.8),
  ('SUBJECT_STANDARD', 1.0),
  ('SUBJECT_TECHNICAL', 1.2),
  ('SUBJECT_DIAGRAM_HEAVY', 1.5),
  ('DELIVERY_CHARGE_DIGITAL', 0.0),
  ('DELIVERY_CHARGE_PHYSICAL', 40.0),
  ('COMMISSION_RATE', 0.20),
  ('MIN_ORDER_VALUE', 60.0)
on conflict (key) do update set value = excluded.value;


/* -------------------------------------------------------------------------- */
/* Production hardening aligned with NoteMate_Overall_Flow.pdf                 */
/* -------------------------------------------------------------------------- */

-- Existing deployments may be missing columns added after the initial MVP.
alter table public.profiles
  add column if not exists available_balance numeric not null default 0,
  add column if not exists rating numeric not null default 0,
  add column if not exists rating_count integer not null default 0,
  add column if not exists is_blocked boolean not null default false,
  add column if not exists phone text default '',
  add column if not exists bio text default '';

alter table public.assignments
  add column if not exists delivery_status text not null default 'not_delivered',
  add column if not exists commission_rate numeric not null default 0.20,
  add column if not exists commission_amount numeric not null default 0,
  add column if not exists writer_amount numeric not null default 0,
  add column if not exists accepted_at timestamp with time zone,
  add column if not exists delivered_at timestamp with time zone,
  add column if not exists completed_at timestamp with time zone,
  add column if not exists cancelled_at timestamp with time zone,
  add column if not exists disputed_at timestamp with time zone;

alter table public.notifications
  add column if not exists assignment_id uuid references public.assignments on delete cascade,
  add column if not exists type text,
  add column if not exists metadata jsonb default '{}'::jsonb;

alter table public.payments
  alter column assignment_id drop not null,
  add column if not exists method text,
  add column if not exists upi_id text,
  add column if not exists account_number text,
  add column if not exists ifsc_code text,
  add column if not exists razorpay_signature text,
  add column if not exists failure_reason text;

create table if not exists public.withdrawals (
  id uuid default gen_random_uuid() primary key,
  writer_id uuid references auth.users on delete cascade not null,
  amount numeric not null check (amount > 0),
  method text not null check (method in ('upi', 'bank')),
  upi_id text,
  account_number text,
  ifsc_code text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'success', 'failed')),
  razorpay_transfer_id text,
  failure_reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  processed_at timestamp with time zone
);

create table if not exists public.disputes (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references public.assignments on delete cascade not null,
  customer_id uuid references auth.users on delete cascade not null,
  writer_id uuid references auth.users on delete set null,
  reason text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text check (resolution in ('refund', 'release', 'split')),
  writer_amount numeric not null default 0,
  customer_refund numeric not null default 0,
  resolved_by uuid references auth.users on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  resolved_at timestamp with time zone
);

alter table public.withdrawals enable row level security;
alter table public.disputes enable row level security;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "Allow public read access to profiles" on public.profiles;
drop policy if exists "Allow all users to read active assignments" on public.assignments;
drop policy if exists "Allow updates by owners or assigned writers" on public.assignments;
drop policy if exists "Allow chat participants to read messages" on public.messages;
drop policy if exists "Allow chat participants to insert messages" on public.messages;
drop policy if exists "Allow users to read their own payments" on public.payments;
drop policy if exists "Allow inserting payment records" on public.payments;
drop policy if exists "Allow write access to config for admins" on public.commission_config;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Admins can read profiles" on public.profiles;
create policy "Admins can read profiles"
on public.profiles for select
using (public.current_user_role() = 'admin');

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Customers can read own assignments" on public.assignments;
create policy "Customers can read own assignments"
on public.assignments for select
using (auth.uid() = user_id);

drop policy if exists "Writers can read paid available assignments" on public.assignments;
create policy "Writers can read paid available assignments"
on public.assignments for select
using (
  public.current_user_role() = 'writer'
  and writer_id is null
  and status = 'Pending'
  and payment_status = 'held'
);

drop policy if exists "Writers can read assigned assignments" on public.assignments;
create policy "Writers can read assigned assignments"
on public.assignments for select
using (
  public.current_user_role() = 'writer'
  and auth.uid() = writer_id
);

drop policy if exists "Admins can manage assignments" on public.assignments;
create policy "Admins can manage assignments"
on public.assignments for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Customers can create own assignments" on public.assignments;
create policy "Customers can create own assignments"
on public.assignments for insert
with check (
  public.current_user_role() = 'customer'
  and auth.uid() = user_id
);

drop policy if exists "Assignment participants can read messages" on public.messages;
create policy "Assignment participants can read messages"
on public.messages for select
using (
  exists (
    select 1 from public.assignments a
    where a.id = messages.assignment_id
      and (a.user_id = auth.uid() or a.writer_id = auth.uid() or public.current_user_role() = 'admin')
  )
);

drop policy if exists "Assignment participants can send messages" on public.messages;
create policy "Assignment participants can send messages"
on public.messages for insert
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.assignments a
    where a.id = messages.assignment_id
      and (a.user_id = auth.uid() or a.writer_id = auth.uid())
  )
);

drop policy if exists "Users can read own withdrawals" on public.withdrawals;
create policy "Users can read own withdrawals"
on public.withdrawals for select
using (auth.uid() = writer_id or public.current_user_role() = 'admin');

drop policy if exists "Users can create own withdrawals" on public.withdrawals;
create policy "Users can create own withdrawals"
on public.withdrawals for insert
with check (auth.uid() = writer_id and public.current_user_role() = 'writer');

drop policy if exists "Users can read own disputes" on public.disputes;
create policy "Users can read own disputes"
on public.disputes for select
using (
  auth.uid() = customer_id
  or auth.uid() = writer_id
  or public.current_user_role() = 'admin'
);

drop policy if exists "Customers can create disputes" on public.disputes;
create policy "Customers can create disputes"
on public.disputes for insert
with check (auth.uid() = customer_id);

drop policy if exists "Users can read own payments" on public.payments;
create policy "Users can read own payments"
on public.payments for select
using (auth.uid() = user_id or public.current_user_role() = 'admin');

drop policy if exists "Authenticated users can insert own payment records" on public.payments;
create policy "Authenticated users can insert own payment records"
on public.payments for insert
with check (auth.uid() = user_id);

drop policy if exists "Admins can manage commission config" on public.commission_config;
create policy "Admins can manage commission config"
on public.commission_config for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create or replace function public.accept_assignment(p_assignment_id uuid)
returns public.assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment public.assignments;
begin
  if public.current_user_role() <> 'writer' then
    raise exception 'Only approved writers can accept assignments';
  end if;

  update public.assignments
  set writer_id = auth.uid(),
      status = 'Accepted',
      accepted_at = now()
  where id = p_assignment_id
    and writer_id is null
    and status = 'Pending'
    and payment_status = 'held'
  returning * into v_assignment;

  if v_assignment.id is null then
    raise exception 'Assignment is no longer available';
  end if;

  insert into public.notifications (user_id, assignment_id, type, title, message, read)
  values (
    v_assignment.user_id,
      v_assignment.id,
      'assignment_accepted',
    'Assignment Accepted',
    'Your assignment "' || v_assignment.title || '" has been accepted by a writer.',
    false
  );

  return v_assignment;
end;
$$;

create or replace function public.request_withdrawal(
  p_amount numeric,
  p_method text,
  p_upi_id text default null,
  p_account_number text default null,
  p_ifsc_code text default null
)
returns public.withdrawals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric;
  v_withdrawal public.withdrawals;
begin
  if public.current_user_role() <> 'writer' then
    raise exception 'Only writers can withdraw earnings';
  end if;

  if p_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero';
  end if;

  select available_balance into v_balance
  from public.profiles
  where id = auth.uid()
  for update;

  if coalesce(v_balance, 0) < p_amount then
    raise exception 'Withdrawal amount exceeds available balance';
  end if;

  update public.profiles
  set available_balance = available_balance - p_amount
  where id = auth.uid();

  insert into public.withdrawals (
    writer_id,
    amount,
    method,
    upi_id,
    account_number,
    ifsc_code,
    status
  )
  values (
    auth.uid(),
    p_amount,
    p_method,
    p_upi_id,
    p_account_number,
    p_ifsc_code,
    'pending'
  )
  returning * into v_withdrawal;

  insert into public.payments (
    user_id,
    amount,
    type,
    status,
    method,
    upi_id,
    account_number,
    ifsc_code
  )
  values (
    auth.uid(),
    p_amount,
    'payout',
    'pending',
    p_method,
    p_upi_id,
    p_account_number,
    p_ifsc_code
  );

  insert into public.notifications (user_id, title, message, read)
  values (
    auth.uid(),
    'Withdrawal Requested',
    'Your payout request of ₹' || p_amount || ' is pending processing.',
    false
  );

  return v_withdrawal;
end;
$$;

notify pgrst, 'reload schema';
