# サーバーを本番（Cloudflare）に出す

サーバー（apps/api）を Cloudflare Workers に、DB を Cloudflare D1 に置く。出したあとは Mac でサーバーを動かさなくても、iPhone のアプリが使える。

コマンドはすべて Mac のターミナルで実行する。料金は Workers・D1 とも無料枠で足りる（1日10万リクエストまで）。Claude API だけは使った分の料金がかかる。

## 初回

### 1. 準備

```sh
git checkout main && git pull
pnpm install
cd apps/api
```

Cloudflare のアカウントがなければ https://dash.cloudflare.com/sign-up で作る（無料）。

### 2. Cloudflare にログイン

```sh
pnpm exec wrangler login
```

ブラウザが開くので「Allow」を押す。

### 3. DB を作る（済み）

本番の DB（`novel-db`）は作成済みで、ID は `apps/api/wrangler.jsonc` に入っている。別の Cloudflare アカウントに出し直すときだけ、`pnpm exec wrangler d1 create novel-db` を実行し（「add it on your behalf?」には **No**）、表示された `database_id` で `wrangler.jsonc` の ID を置き換える。

### 4. 出す

```sh
pnpm run deploy
```

- DB の表を作る（「Ok to proceed?」には `y`）→ サーバーを出す、の順に進む
- 初めてだと workers.dev のサブドメイン（URL の一部になる名前）を聞かれる。好きな英小文字の名前を入れる
- 最後に `https://ballad-api.<サブドメイン>.workers.dev` が表示される。これが本番の URL

> `pnpm deploy`（run なし）は pnpm 自身の別のコマンドが動くので、必ず `pnpm run deploy` と打つ。

### 5. 秘密の値を入れる

1つずつ実行する。入れた直後から本番に反映される。

```sh
# ログインの署名用。ランダムな文字列を作ってそのまま入れる
openssl rand -base64 32 | pnpm exec wrangler secret put BETTER_AUTH_SECRET

# 4 で表示された URL を貼る
pnpm exec wrangler secret put BETTER_AUTH_URL

# Claude API のキーを貼る（apps/api/.dev.vars に入れているものと同じでよい）
pnpm exec wrangler secret put ANTHROPIC_API_KEY

# 通報を知らせる Slack の Incoming Webhook の URL を貼る（Slack の「アプリ > Incoming Webhooks」で作る）
pnpm exec wrangler secret put OPS_WEBHOOK_URL
```

`OPS_WEBHOOK_URL` が空だと通報の通知は届かない（通報そのものは貯まる）。

運営の管理画面（`/admin`）は、運営アカウントでログインして使う。初回だけ次の手順で運営アカウントを登録する。

1. ブラウザで `https://ballad-api.<サブドメイン>.workers.dev/admin` を開く
2. 運営用のメールアドレスと長いパスワード（パスワード管理アプリで作って保存する）を入れ、「運営用アカウントを作る」
3. 「権限がありません」と一緒に出る利用者IDをコピーし、次のコマンドでそのアカウントを運営の役割にする（`<利用者ID>` を置き換える。人を増やすときも同じ）

   ```bash
   pnpm exec wrangler d1 execute novel-db --remote --command "update \"user\" set role = 'admin' where id = '<利用者ID>'"
   ```

   運営から外すときは `role = 'user'` にする
4. 管理画面で「読み直す」を押し、一覧が出れば完了

Google ログインのクライアントIDは `wrangler.jsonc` に入っているので、何もしなくてよい。

### 6. 動いているか確かめる

ブラウザで `https://ballad-api.<サブドメイン>.workers.dev/api/openings` を開く。冒頭文の一覧（JSON）が出れば成功。

運営の管理画面は `https://ballad-api.<サブドメイン>.workers.dev/admin`、権利者の申し立てフォームは `/rights` にある。

### 7. iPhone のアプリを本番につなぐ

```sh
cd ../mobile
flutter devices   # iPhone の端末IDを調べる
flutter run --release -d <端末ID> --dart-define=API_URL=https://ballad-api.<サブドメイン>.workers.dev
```

- これで Mac のサーバーを止めても、テザリングなしで使える
- **Mac で作ったアカウントや作品は本番には引き継がれない。** 本番で登録し直す
- 無料の Apple ID で入れたアプリは7日で開けなくなる。そのときは Mac でこの手順をもう一度実行する（Mac が要らなくなるのは有料の Apple Developer Program で TestFlight を使うとき）

## 2回目から（コードを直したあと）

リポジトリのルートで：

```sh
pnpm deploy:api
```

新しいマイグレーションがあれば本番 DB に当ててから出す。

## Worker の名前を `tsuzuri-api` から `ballad-api` に付け替える（アプリ名変更にともなう1回限りの作業）

アプリ名を Ballad に変えたとき、`wrangler.jsonc` の `name` も `ballad-api` にした。Wrangler は名前が違うと**別の Worker として新しく作る**ので、旧名で公開済みなら次の手順で付け替える。秘密の値は Worker ごとに持つため、入れ直しが要る。DB（D1）は `wrangler.jsonc` の ID で結びつくので、そのまま新しい Worker から使える。

```sh
cd apps/api

# 1. 新しい名前で出す。最後に https://ballad-api.<サブドメイン>.workers.dev が表示される
pnpm run deploy

# 2. 秘密の値を新しい Worker に入れ直す
openssl rand -base64 32 | pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put BETTER_AUTH_URL      # 1 で表示された新しい URL を貼る
pnpm exec wrangler secret put ANTHROPIC_API_KEY    # Claude API のキーを貼る

# 3. 動くか確かめる
#    ブラウザで https://ballad-api.<サブドメイン>.workers.dev/api/openings を開く

# 4. 旧 Worker を消す（URL が2つ生きていると混乱するため）
pnpm exec wrangler delete --name tsuzuri-api
```

付け替えのあとに残っている ToDo：

- [ ] iPhone に新しいアプリ（`com.taiyomatsuda.ballad`）を入れて Google ログインできるのを確かめたら、Google Cloud の「クライアント」一覧から**旧 iOS クライアント**（バンドルID `com.taiyomatsuda.tsuzuri`、IDの末尾 `48nmgne8…`）を削除する。先に消すと旧アプリでログインできなくなる
- [ ] iPhone から旧アプリ（Tsuzuri）を手で消す

- `BETTER_AUTH_SECRET` を新しくするので、旧 URL でログインしていた端末はログインし直しになる
- iPhone のアプリは 7 の手順を新しい URL（`--dart-define=API_URL=https://ballad-api.<サブドメイン>.workers.dev`）でもう一度実行する
- バンドルIDも `com.taiyomatsuda.ballad` に変えたので、Google Cloud で iOS 用クライアントIDを作り直す（[docs/decisions/0006-rename-to-ballad.md](decisions/0006-rename-to-ballad.md)）

## 困ったとき

| 症状                           | 見るところ                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| エラーの中身を知りたい         | `cd apps/api && pnpm exec wrangler tail` を実行したままアプリを操作すると、サーバーのログが流れる |
| ログインできない               | 5 の `BETTER_AUTH_SECRET` と `BETTER_AUTH_URL` が入っているか：`pnpm exec wrangler secret list`   |
| 小説がフェイクの文章になる     | `ANTHROPIC_API_KEY` が入っていない                                                                |
| 手元の開発サーバーが空になった | 3 で ID を変えると手元の DB も新しくなる。`pnpm db:migrate:local` をもう一度実行する              |
