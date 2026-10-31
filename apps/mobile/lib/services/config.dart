/// サーバー（apps/api）のURL。`--dart-define=API_URL=...` で変える。
/// iOS シミュレーターは Mac の localhost に届く。Android エミュレーターは `http://10.0.2.2:8787`、
/// 実機は `http://<MacのIP>:8787`、本番は `https://tsuzuri-api.<サブドメイン>.workers.dev` を指定する。
const apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:8787',
);

/// Google ログインの iOS 用クライアントID（Google Cloud の Google Auth Platform で作った値。秘密ではない）
const googleIosClientId = String.fromEnvironment(
  'GOOGLE_IOS_CLIENT_ID',
  defaultValue: '396718317713-48nmgne8mhce12ivqtajit6fco7bksdo.apps.googleusercontent.com',
);

/// サーバーが確かめる ID トークンの宛先（Web 用クライアントID）。サーバーの GOOGLE_CLIENT_IDS にも入れる
const googleServerClientId = String.fromEnvironment(
  'GOOGLE_SERVER_CLIENT_ID',
  defaultValue: '396718317713-pn89nr0mc059mecl8r3avgusm9j1vsqb.apps.googleusercontent.com',
);
