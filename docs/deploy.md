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

### 3. DB を作る

```sh
pnpm exec wrangler d1 create novel-db
```

- 「Would you like Wrangler to add it on your behalf?」と聞かれたら **No** を選ぶ（設定はすでにある）
- 表示された `database_id`（`xxxxxxxx-xxxx-...` の形）を、`apps/api/wrangler.jsonc` の `"database_id": "00000000-0000-0000-0000-000000000000"` の 0 の部分と置き換える
- このIDは秘密ではない。リポジトリにも入れておくと、次からこの手順が要らない

### 4. 出す

```sh
pnpm run deploy
```

- DB の表を作る（「Ok to proceed?」には `y`）→ サーバーを出す、の順に進む
- 初めてだと workers.dev のサブドメイン（URL の一部になる名前）を聞かれる。好きな英小文字の名前を入れる
- 最後に `https://tsuzuri-api.<サブドメイン>.workers.dev` が表示される。これが本番の URL

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
```

Google ログインのクライアントIDは `wrangler.jsonc` に入っているので、何もしなくてよい。

### 6. 動いているか確かめる

ブラウザで `https://tsuzuri-api.<サブドメイン>.workers.dev/api/openings` を開く。冒頭文の一覧（JSON）が出れば成功。

### 7. iPhone のアプリを本番につなぐ

```sh
cd ../mobile
flutter devices   # iPhone の端末IDを調べる
flutter run --release -d <端末ID> --dart-define=API_URL=https://tsuzuri-api.<サブドメイン>.workers.dev
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

## 困ったとき

| 症状                           | 見るところ                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| エラーの中身を知りたい         | `cd apps/api && pnpm exec wrangler tail` を実行したままアプリを操作すると、サーバーのログが流れる |
| ログインできない               | 5 の `BETTER_AUTH_SECRET` と `BETTER_AUTH_URL` が入っているか：`pnpm exec wrangler secret list`   |
| 小説がフェイクの文章になる     | `ANTHROPIC_API_KEY` が入っていない                                                                |
| 手元の開発サーバーが空になった | 3 で ID を変えると手元の DB も新しくなる。`pnpm db:migrate:local` をもう一度実行する              |
