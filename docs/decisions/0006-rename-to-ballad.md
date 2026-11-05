# 0006 アプリ名を Tsuzuri から Ballad に変える

- 日付：2026-11-05
- 状態：決定

## 決定

- アプリの名前を **Ballad（バラッド）** にする。英語で「物語詩」。人から人へ語り継がれる物語、という意味がこのアプリに合う
- 変えるもの：画面やストアに出る表示名、Flutter のパッケージ名（`ballad`）、Worker の名前（`ballad-api`）、ドキュメント
- **変えないもの**：iOS のバンドルIDと Android の applicationId（`com.taiyomatsuda.tsuzuri`）、Android の Kotlin パッケージ、端末に保存するトークンのキー（`tsuzuri.session_token`）。Google ログインのクライアントIDがバンドルIDに紐づいていて、変えると Google Cloud でクライアントを作り直す必要があるため。利用者には見えない内部の名前なので、そのまま使う

## 理由

- taiyo が「Tsuzuri からは、小説を作って共有するサービスだと連想できない」と判断した
- 候補を出して絞った結果、「ふだんの英単語1語で、意味がしっかりあるもの」を選ぶ方針になり、Ballad に決めた
- 名前の空き：App Store とウェブに同名の物語アプリはなかった。米国の商標「BALLAD」は3件とも失効していて、ソフトウェアの区分に生きているものはない。日本の商標（J-PlatPat）とドメインは未確認

## 注意

- Worker の名前を変えると URL も変わる。付け替えの手順は [docs/deploy.md](../deploy.md) の「Worker の名前を付け替える」にある
- ストアに出す前に、バンドルIDを `com.taiyomatsuda.ballad` に揃えるかどうかをもう一度決める（公開後は変えられない）。揃える場合は Google Cloud で iOS / Android のクライアントIDを作り直し、`wrangler.jsonc` の `GOOGLE_CLIENT_IDS` と `config.dart`・`Info.plist` を更新する
