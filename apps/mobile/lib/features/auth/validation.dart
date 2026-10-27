/// パスワードの最短の長さ（サーバーの packages/core/src/auth と同じ値にする）
const minPasswordLength = 8;

/// パスワードの最長の長さ（Better Auth の既定と同じ）
const maxPasswordLength = 128;

// サーバー側（zod）の検証より緩いが、明らかな打ち間違いを弾くには十分
final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

/// 入力されたメールアドレスを、前後の空白を除いて小文字にそろえる。
String normalizeEmail(String input) => input.trim().toLowerCase();

bool isValidEmail(String input) =>
    _emailPattern.hasMatch(normalizeEmail(input));

bool isValidPassword(String input) =>
    input.length >= minPasswordLength && input.length <= maxPasswordLength;

/// Better Auth のエラーを、画面に出す日本語にする。
String authErrorMessage({String? code, int? status}) {
  if (status == 429) return '試行が続いたため、少し時間をおいてからお試しください。';
  if (code != null && code.startsWith('USER_ALREADY_EXISTS')) {
    return 'このメールアドレスはすでに登録されています。「ログイン」から入ってください。';
  }
  if (code == 'INVALID_EMAIL_OR_PASSWORD') return 'メールアドレスかパスワードが違います。';
  if (code == 'INVALID_EMAIL') return 'メールアドレスの形式が正しくありません。';
  if (code == 'PASSWORD_TOO_SHORT') {
    return 'パスワードは$minPasswordLength文字以上にしてください。';
  }
  return 'うまくいきませんでした。通信状態を確かめて、もう一度お試しください。';
}
