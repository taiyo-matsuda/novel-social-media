-- 無断転載などへの対応：作品の非表示・取り下げ、違反の記録、アカウント停止、作者の異議、権利者の申し立て
-- 方針は docs/decisions/0007-copyright-infringement.md

-- 運営の判断による作品の状態（作者が決める公開・下書きとは別）
-- ok：問題なし、hidden：通報がたまったので確認まで仮で隠している、removed：運営が取り下げた。
-- 運営が問題なしと確認したら、その作品の通報を対応済みにして ok に戻す（数えるのは未対応の通報だけ）
alter table "works" add column "moderation" text not null default 'ok'
  check ("moderation" in ('ok', 'hidden', 'removed'));

-- 取り下げた作品ごとに1件の違反。STRIKES_TO_SUSPEND 件でアカウントを止める。
-- 作品が消えても違反は残すので、作品とは外部キーでつながない
create table "strikes" (
  "id" integer primary key autoincrement,
  "user_id" text not null references "user" ("id") on delete cascade,
  "work_id" text not null,
  "reason" text not null,
  "created_at" text not null default (datetime('now')),
  unique ("user_id", "work_id")
);

-- 止めたアカウント。止まっている間はログインできず、公開作品も出ない
create table "suspensions" (
  "user_id" text primary key references "user" ("id") on delete cascade,
  "reason" text not null,
  "created_at" text not null default (datetime('now'))
);

-- 非表示・取り下げへの作者の異議
create table "appeals" (
  "id" integer primary key autoincrement,
  "work_id" text not null references "works" ("id") on delete cascade,
  "author_id" text not null references "user" ("id") on delete cascade,
  "body" text not null,
  "status" text not null default 'open' check ("status" in ('open', 'resolved')),
  "created_at" text not null default (datetime('now'))
);

-- アプリを使っていない権利者からの申し立て（Web のフォーム /rights）。
-- 対象の作品は申立人の書いた作品名などから運営が探すので、作品IDは任意
create table "rights_claims" (
  "id" integer primary key autoincrement,
  "work_id" text references "works" ("id") on delete set null,
  "claimant_name" text not null,
  -- 運営からの連絡にだけ使う。作者や他の利用者には見せない
  "claimant_email" text not null,
  "target" text not null,
  "original" text not null,
  "detail" text,
  "status" text not null default 'open' check ("status" in ('open', 'resolved')),
  "created_at" text not null default (datetime('now'))
);

create index "strikes_user_id_idx" on "strikes" ("user_id");
create index "appeals_status_idx" on "appeals" ("status", "created_at");
create index "rights_claims_status_idx" on "rights_claims" ("status", "created_at");
create index "reports_work_id_idx" on "reports" ("work_id", "status");
