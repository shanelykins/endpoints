-- Create the endpoints table
create table if not exists public.endpoints (
  id text primary key,
  api_type text not null,
  name text not null,
  target_url text not null,
  allowed_origins text[] not null default array['*'],
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null default 'not_tested',
  last_tested timestamp with time zone,
  proxy_url text
);

-- Enable Row Level Security (RLS)
alter table public.endpoints enable row level security;

-- Create policy to allow all operations for now (you can restrict this later)
create policy "Allow public access"
  on public.endpoints
  for all
  using (true)
  with check (true);

-- Create the function to initialize the table
create or replace function create_endpoints_table()
returns void
language plpgsql
security definer
as $$
begin
  -- Create the table if it doesn't exist
  create table if not exists public.endpoints (
    id text primary key,
    api_type text not null,
    name text not null,
    target_url text not null,
    allowed_origins text[] not null default array['*'],
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    status text not null default 'not_tested',
    last_tested timestamp with time zone,
    proxy_url text
  );

  -- Enable RLS
  alter table public.endpoints enable row level security;

  -- Create policy
  drop policy if exists "Allow public access" on public.endpoints;
  create policy "Allow public access"
    on public.endpoints
    for all
    using (true)
    with check (true);
end;
$$;