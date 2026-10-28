# 0005 ストア公開の前に、通報・ブロック・アプリ内の退会を入れる

- 日付：2026-10-28
- 状態：決定

## 決定

- MVP（[product.md](../product.md)）の5項目がそろったので、次は App Store / Google Play の審査で求められる**通報・ブロック・退会**を作る
- **通報**：読む画面の右上のメニューから、理由（性的・暴力・誹謗中傷・スパム・権利侵害・その他）と任意の補足を送る。`reports` 表に貯め、運営が確認する。通報した作品は通報した人の一覧と読む画面から消える
- **ブロック**：読む画面から作者をブロックする。どちらがブロックしても、お互いの公開作品が一覧・読む画面・高評価・読んだ記録のどれにも出なくなる。相手には知らせない。「書く」タブの「ブロックした人」から解除できる
- **退会**：Better Auth の `POST /api/auth/delete-user` を有効にし、アプリは必ずパスワードを送る。作品・章・好み・読んだ記録・高評価・ブロックは DB の `on delete cascade` で消える。本人が出した通報は通報者を空にして残す（作品が残っていれば運営の確認に使う）

## 理由

- Apple の審査ガイドライン 1.2（ユーザー生成コンテンツ）は、不適切な内容の通報・迷惑な利用者のブロック・運営の連絡先を求める。AIが書いた作品でも、利用者が公開するので同じ扱いになる
- Apple の 5.1.1(v) と Google Play は、アカウントを作れるアプリにアプリ内での削除を求める
- 公開の直前に慌てて足すより、ランキングや行動学習の形が固まった今のうちに入れたほうが、見えなくする条件をクエリ1か所（`d1-public-works-store.ts` の `SELECT_PUBLIC_WORK`）にまとめられる

## 運営の対応（いまは管理画面がない）

- 未対応の通報を見る：`pnpm exec wrangler d1 execute novel-db --remote --command "select r.id, r.reason, r.detail, r.created_at, w.id as work_id, w.title from reports r join works w on w.id = r.work_id where r.status = 'open' order by r.created_at"`
- 作品を取り下げる：`update works set status = 'draft' where id = '<作品ID>'`（作者がまた公開できるので、悪質なら作品ごと `delete from works where id = '<作品ID>'`）
- 対応済みにする：`update reports set status = 'resolved' where work_id = '<作品ID>'`
- Apple は通報に「速やかに」（目安24時間以内）対応することを求める。公開後は毎日確認する

## まだやっていないこと

- 通報が来たときに運営へ知らせる仕組み（メールや Slack への通知）と管理画面
- 運営の連絡先（サポートURL）をアプリとストアの掲載情報に載せる
- 同じ作品に通報が一定数たまったら自動で非表示にする
