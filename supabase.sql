-- Drop existing table if it exists
drop table if exists public.endpoints;

-- Create the endpoints table with correct column names and types
create table public.endpoints (
    id text primary key,
    api_type text not null,
    name text not null,
    target_url text not null,
    allowed_origins text[] not null default array['*'],
    description text,
    created_at timestamptz default now() not null,
    status text not null default 'not_tested'::text,
    last_tested timestamptz,
    proxy_url text
);

-- Enable Row Level Security (RLS)
alter table public.endpoints enable row level security;

-- Create policy to allow all operations
create policy "Enable all operations for endpoints"
    on public.endpoints
    for all
    using (true)
    with check (true);

-- Grant access to authenticated and anon users
grant all on public.endpoints to authenticated, anon;

-- Create indexes for better performance
create index if not exists endpoints_created_at_idx on public.endpoints (created_at desc);
create index if not exists endpoints_api_type_idx on public.endpoints (api_type);
create index if not exists endpoints_status_idx on public.endpoints (status);