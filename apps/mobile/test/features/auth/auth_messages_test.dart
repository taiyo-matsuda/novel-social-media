import 'package:flutter_test/flutter_test.dart';
import 'package:ballad/features/auth/auth_messages.dart';

void main() {
  test('ログインのエラー文はメールアドレスやパスワードに触れない', () {
    for (final m in [tooManyAttemptsMessage, googleErrorMessage]) {
      expect(m, isNot(contains('パスワード')));
      expect(m, isNot(contains('メールアドレス')));
    }
  });
}
