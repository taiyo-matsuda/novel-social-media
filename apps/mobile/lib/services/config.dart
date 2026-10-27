/// サーバー（apps/api）のURL。`--dart-define=API_URL=...` で変える。
/// iOS シミュレーターは Mac の localhost に届く。Android エミュレーターは `http://10.0.2.2:8787`、
/// 実機は `http://<MacのIP>:8787` を指定する。
const apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:8787',
);
