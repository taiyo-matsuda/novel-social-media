-- MVPの初期スキーマ（Cloudflare D1 / SQLite）
-- 方針：D1 には RLS がないので、誰が読み書きできるかは API のコードで必ず絞る（ログイン中の利用者IDで条件を付ける）

-- ログイン（Better Auth が使う表。列名は Better Auth の決まりに合わせる）
-- user には email が入るので、他人に見せる API では name 以外を返さない
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null);

create table "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");
-- 初回に見せる冒頭文（運営が用意する）
create table "openings" (
  "id" integer primary key autoincrement,
  "text" text not null,
  "genre" text,
  -- 表示する順番（小さいほど先）
  "sort_order" integer not null default 0,
  "created_at" text not null default (datetime('now'))
);

-- 冒頭文への「読みたい／読みたくない」
create table "opening_choices" (
  "user_id" text not null references "user" ("id") on delete cascade,
  "opening_id" integer not null references "openings" ("id") on delete cascade,
  "wants_to_read" integer not null check ("wants_to_read" in (0, 1)),
  "created_at" text not null default (datetime('now')),
  primary key ("user_id", "opening_id")
);

create table "works" (
  "id" text primary key,
  "author_id" text not null references "user" ("id") on delete cascade,
  "title" text not null,
  "status" text not null default 'draft' check ("status" in ('draft', 'published')),
  -- AIが本文を書いたか（ランキングでの表示方法は未決）
  "ai_generated" integer not null default 1,
  "published_at" text,
  "created_at" text not null default (datetime('now'))
);

create table "chapters" (
  "id" text primary key,
  "work_id" text not null references "works" ("id") on delete cascade,
  "position" integer not null check ("position" >= 1),
  "title" text not null,
  "body" text not null,
  -- この章を生成するときに読者が出した展開リクエスト
  "plot_request" text,
  "created_at" text not null default (datetime('now')),
  unique ("work_id", "position")
);

-- 行動学習の元データ（読み始め・読了・離脱位置）
create table "reading_events" (
  "id" integer primary key autoincrement,
  "user_id" text not null references "user" ("id") on delete cascade,
  "chapter_id" text not null references "chapters" ("id") on delete cascade,
  "kind" text not null check ("kind" in ('start', 'complete', 'leave')),
  -- 離脱時の読了率（0〜1）
  "progress" real check ("progress" between 0 and 1),
  "created_at" text not null default (datetime('now'))
);

create table "likes" (
  "user_id" text not null references "user" ("id") on delete cascade,
  "work_id" text not null references "works" ("id") on delete cascade,
  "created_at" text not null default (datetime('now')),
  primary key ("user_id", "work_id")
);

create index "works_status_published_at_idx" on "works" ("status", "published_at" desc);
create index "reading_events_chapter_kind_idx" on "reading_events" ("chapter_id", "kind");
