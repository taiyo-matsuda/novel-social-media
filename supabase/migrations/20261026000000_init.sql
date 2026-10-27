-- MVPの初期スキーマ：好み入力 → AI生成 → 公開 → ランキング閲覧
-- 方針：すべてのテーブルでRLSを有効にし、本人のデータだけ書ける・公開作品は誰でも読める

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  created_at timestamptz not null default now()
);

-- 初回に見せる冒頭文（運営が用意する）
create table public.openings (
  id bigint generated always as identity primary key,
  text text not null,
  genre text,
  created_at timestamptz not null default now()
);

-- 冒頭文への「読みたい／読みたくない」
create table public.opening_choices (
  user_id uuid not null references public.profiles (id) on delete cascade,
  opening_id bigint not null references public.openings (id) on delete cascade,
  wants_to_read boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, opening_id)
);

create type public.work_status as enum ('draft', 'published');

create table public.works (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  status public.work_status not null default 'draft',
  -- AIが本文を書いたか（ランキングでの表示方法は未決）
  ai_generated boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  position int not null check (position >= 1),
  title text not null,
  body text not null,
  -- この章を生成するときに読者が出した展開リクエスト
  plot_request text,
  created_at timestamptz not null default now(),
  unique (work_id, position)
);

-- 行動学習の元データ（読み始め・読了・離脱位置）
create type public.reading_event_kind as enum ('start', 'complete', 'leave');

create table public.reading_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  kind public.reading_event_kind not null,
  -- 離脱時の読了率（0〜1）
  progress real check (progress between 0 and 1),
  created_at timestamptz not null default now()
);

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  work_id uuid not null references public.works (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

create index on public.works (status, published_at desc);
create index on public.reading_events (chapter_id, kind);

-- RLS
alter table public.profiles enable row level security;
alter table public.openings enable row level security;
alter table public.opening_choices enable row level security;
alter table public.works enable row level security;
alter table public.chapters enable row level security;
alter table public.reading_events enable row level security;
alter table public.likes enable row level security;

create policy "profiles are readable" on public.profiles
  for select using (true);
create policy "own profile is writable" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "openings are readable" on public.openings
  for select using (true);

create policy "own choices" on public.opening_choices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 本文はログイン必須（構想メモの作品保護方針）
create policy "published works are readable when signed in" on public.works
  for select using (
    author_id = auth.uid() or (status = 'published' and auth.uid() is not null)
  );
create policy "own works are writable" on public.works
  for all using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "chapters follow their work" on public.chapters
  for select using (
    exists (select 1 from public.works w where w.id = work_id)
  );
create policy "own chapters are writable" on public.chapters
  for all using (
    exists (select 1 from public.works w where w.id = work_id and w.author_id = auth.uid())
  ) with check (
    exists (select 1 from public.works w where w.id = work_id and w.author_id = auth.uid())
  );

create policy "own reading events" on public.reading_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "likes are readable" on public.likes
  for select using (true);
create policy "own likes" on public.likes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
