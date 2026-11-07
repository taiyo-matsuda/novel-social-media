-- 利用者の役割。'admin' なら運営の管理画面（/admin）を使える。
-- アプリや登録の API からは変えられない（Better Auth に項目を知らせていないので、登録時は必ず 'user' になる）。
-- 運営にするときは wrangler d1 execute で直接書き換える（docs/deploy.md）
alter table "user" add column "role" text not null default 'user';
