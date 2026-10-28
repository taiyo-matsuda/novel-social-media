import 'package:flutter_test/flutter_test.dart';
import 'package:tsuzuri/features/auth/validation.dart';

void main() {
  test('メールアドレスは前後の空白を除いて小文字にする', () {
    expect(normalizeEmail('  Taro@Example.COM '), 'taro@example.com');
  });

  test('メールアドレスの形式を確かめる', () {
    expect(isValidEmail(' taro@example.com '), isTrue);
    expect(isValidEmail('taro@example'), isFalse);
    expect(isValidEmail('taro example.com'), isFalse);
    expect(isValidEmail(''), isFalse);
  });

  test('パスワードは8文字以上128文字以下', () {
    expect(isValidPassword('1234567'), isFalse);
    expect(isValidPassword('12345678'), isTrue);
    expect(isValidPassword('a' * 128), isTrue);
    expect(isValidPassword('a' * 129), isFalse);
  });

  group('authErrorMessage', () {
    test('登録済みのメールアドレス', () {
      expect(
        authErrorMessage(code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'),
        contains('すでに登録されています'),
      );
    });

    test('パスワード違い', () {
      expect(
        authErrorMessage(code: 'INVALID_EMAIL_OR_PASSWORD', status: 401),
        'メールアドレスかパスワードが違います。',
      );
    });

    test('試行が多すぎる', () {
      expect(authErrorMessage(status: 429), contains('時間をおいて'));
    });

    test('わからないエラーは通信状態の確認を促す', () {
      expect(authErrorMessage(), contains('通信状態'));
    });
  });
}
