-- 通報とブロック（App Store / Google Play の審査で、他人の作品を読めるアプリに求められる）

-- 作品の通報。運営が確認して対応する。通報した人が退会しても通報は残す
create table "reports" (
  "id" integer primary key autoincrement,
  "reporter_id" text references "user" ("id") on delete set null,
  "work_id" text not null references "works" ("id") on delete cascade,
  "reason" text not null check ("reason" in ('sexual', 'violence', 'harassment', 'spam', 'rights', 'other')),
  -- 通報した人の補足（任意）
  "detail" text,
  -- 運営の対応状況（open：未対応、resolved：対応済み）
  "status" text not null default 'open' check ("status" in ('open', 'resolved')),
  "created_at" text not null default (datetime('now')),
  -- 同じ人が同じ作品を何度通報しても1件（理由は上書き）
  unique ("reporter_id", "work_id")
);

-- ブロック。どちらの作品もお互いに見えなくなる
create table "blocks" (
  "blocker_id" text not null references "user" ("id") on delete cascade,
  "blocked_id" text not null references "user" ("id") on delete cascade,
  "created_at" text not null default (datetime('now')),
  primary key ("blocker_id", "blocked_id"),
  check ("blocker_id" != "blocked_id")
);

create index "reports_status_created_at_idx" on "reports" ("status", "created_at");
create index "blocks_blocked_id_idx" on "blocks" ("blocked_id");
