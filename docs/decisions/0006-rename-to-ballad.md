# 0006 アプリ名を Tsuzuri から Ballad に変える

- 日付：2026-11-05
- 状態：決定

## 決定

- アプリの名前を **Ballad（バラッド）** にする。英語で「物語詩」。人から人へ語り継がれる物語、という意味がこのアプリに合う
- 変えるもの：画面やストアに出る表示名、Flutter のパッケージ名（`ballad`）、Worker の名前（`ballad-api`）、iOS のバンドルIDと Android の applicationId（`com.taiyomatsuda.ballad`）、Android の Kotlin パッケージ、端末に保存するトークンのキー（`ballad.session_token`）、ドキュメント
- iOS のクライアントIDはバンドルIDに紐づくので、Google Cloud で **iOS 用クライアントを作り直す**。Web 用（サーバーが確かめる宛先）はバンドルIDと無関係なので、そのまま使う。Android 用はまだ作っていない
- 公開前なので、バンドルIDを変えても困る人はいない。ストアに出したあとは変えられないため、今のうちに揃える（taiyo の判断）

## 理由

- taiyo が「Tsuzuri からは、小説を作って共有するサービスだと連想できない」と判断した
- 候補を出して絞った結果、「ふだんの英単語1語で、意味がしっかりあるもの」を選ぶ方針になり、Ballad に決めた
- 名前の空き：App Store とウェブに同名の物語アプリはなかった。米国の商標「BALLAD」は3件とも失効していて、ソフトウェアの区分に生きているものはない。日本の商標（J-PlatPat）とドメインは未確認

## 注意

- Worker の名前を変えると URL も変わる。付け替えの手順は [docs/deploy.md](../deploy.md) の「Worker の名前を付け替える」にある
- 新しい iOS クライアントIDは、`apps/mobile/lib/services/config.dart` の `googleIosClientId`、`ios/Runner/Info.plist` の `GIDClientID` と URL スキーム（IDを逆順にしたもの）、`apps/api/wrangler.jsonc` の `GOOGLE_CLIENT_IDS` の3か所に入れる。旧 iOS クライアント（バンドルID `com.taiyomatsuda.tsuzuri`）は Google Cloud から消してよい
- iPhone には旧バンドルIDのアプリが残るので、新しいアプリを入れたら旧アプリは手で消す
