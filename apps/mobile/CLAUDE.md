# apps/mobile（スマホアプリ）

Flutter（Dart）で作る iOS / Android アプリ。開発は Mac で行う。

## フォルダ

```
lib/main.dart         起動と、ログイン状態で見せる画面の切り替え
lib/features/<機能>/  画面（*_screen.dart）とその機能のロジック
lib/services/         サーバーの呼び出し（api_client.dart）・設定・保存
lib/widgets/          画面で共通の部品
test/                 lib/ と同じ並びでテストを置く（*_test.dart）
```

## このアプリでのルール

- サーバーの呼び出しは `lib/services/api_client.dart` にまとめる。型の正は `packages/core/src/api`（TypeScript）なので、API を変えたら両方を直す
- ログインは主に Google（`lib/services/google_sign_in.dart` で端末上でログインし、ID トークンをサーバーへ送る）。クライアントIDは `--dart-define=GOOGLE_IOS_CLIENT_ID=... --dart-define=GOOGLE_SERVER_CLIENT_ID=...` で渡し、iOS は `ios/Runner/Info.plist` の URL スキームに iOS クライアントIDを逆順にしたものを入れる
- ログイン状態は Better Auth の bearer プラグイン。トークンは `TokenStore`（`flutter_secure_storage`）に保存し、`Authorization: Bearer` で送る。トークンをログに出さない
- テストではサーバーを呼ばない。`ApiClient` に `package:http/testing.dart` の `MockClient` を渡すか、`ApiClient` を継承した偽物を使う（`test/features/auth/auth_controller_test.dart`）
- 画面の状態は `ChangeNotifier`（`AuthController`）と `StatefulWidget` で持つ。状態管理のパッケージは必要になるまで入れない
- パッケージの追加は `flutter pub add <名前>`
- サーバーの URL は `--dart-define=API_URL=...`（既定は `http://localhost:8787`。iOS シミュレーターはそのまま Mac に届く。Android エミュレーターは `http://10.0.2.2:8787`）

## コマンド（このフォルダで実行）

| 目的                         | コマンド                                                  |
| ---------------------------- | --------------------------------------------------------- |
| シミュレーターで起動         | `open -a Simulator` のあと `flutter run`                  |
| まとめて確認                 | `dart format lib test && flutter analyze && flutter test` |
| iOS 向けにビルドだけ確かめる | `flutter build ios --simulator --debug`                   |

## 実機（iPhone）で試す

1. iPhone と Mac を同じネットワーク（Wi‑Fi かテザリング）につなぎ、Mac の IP を調べる：`ipconfig getifaddr en0`
2. サーバーをネットワーク向けに起動する（apps/api で）：`pnpm exec wrangler dev --ip 0.0.0.0`
3. iPhone に入れる：`flutter run --release -d <端末ID> --dart-define=API_URL=http://<MacのIP>:8787`（端末IDは `flutter devices`）。デバッグ版はワイヤレスだと起動できないことがあるので release で入れる
4. 初回だけ iPhone の「設定 > 一般 > VPNとデバイス管理」で開発者（Apple Development）を「信頼」する。無料の Apple ID で署名したアプリは7日で開けなくなるので、そのときは 3 をやり直す

開発中は Mac の http サーバーにつなぐため、iOS は `NSAllowsLocalNetworking`、Android はデバッグ版だけ http を許可している。本番の API は https なので影響しない。
