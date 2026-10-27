/// サーバー（apps/api）のURL。`--dart-define=API_URL=...` で変える。
/// iOS シミュレーターは Mac の localhost に届く。Android エミュレーターは `http://10.0.2.2:8787`、
/// 実機は `http://<MacのIP>:8787` を指定する。
const apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:8787',
);

/// Google ログインの iOS 用クライアントID（Google Cloud の「認証情報」で作る）
const googleIosClientId = String.fromEnvironment('GOOGLE_IOS_CLIENT_ID');

/// サーバーが確かめる ID トークンの宛先（Web 用クライアントID）。サーバーの GOOGLE_CLIENT_IDS にも入れる
const googleServerClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
