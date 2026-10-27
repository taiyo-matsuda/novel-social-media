import 'package:flutter_test/flutter_test.dart';
import 'package:novel_sns/features/auth/auth_controller.dart';
import 'package:novel_sns/features/auth/validation.dart';
import 'package:novel_sns/services/api_client.dart';
import 'package:novel_sns/services/google_sign_in.dart';
import 'package:novel_sns/services/token_store.dart';

const taro = SessionUser(id: 'u1', email: 'taro@example.com', name: '読者');

/// サーバーを呼ばない ApiClient
class FakeApi extends ApiClient {
  FakeApi() : super(baseUrl: 'http://api.test', tokens: MemoryTokenStore());

  SessionUser? session;
  Map<int, bool> choices = {};
  ApiException? signInError;
  String? lastEmail;

  @override
  Future<SessionUser?> getSession() async => session;

  @override
  Future<SessionUser> signIn({
    required String email,
    required String password,
  }) async {
    lastEmail = email;
    if (signInError != null) throw signInError!;
    return session = taro;
  }

  @override
  Future<SessionUser> signUp({
    required String email,
    required String password,
    required String name,
  }) => signIn(email: email, password: password);

  String? googleIdToken;

  @override
  Future<SessionUser> signInWithGoogle(String idToken) async {
    googleIdToken = idToken;
    if (signInError != null) throw signInError!;
    return session = taro;
  }

  @override
  Future<void> signOut() async => session = null;

  @override
  Future<Map<int, bool>> fetchOwnChoices() async => choices;
}

/// 端末の Google ログインの偽物。token が null なら途中でやめた扱い
class FakeGoogle implements GoogleIdTokenSource {
  String? token = 'google-id-token';
  bool fail = false;
  bool signedOut = false;

  @override
  Future<String?> signIn() async {
    if (fail) throw Exception('network');
    return token;
  }

  @override
  Future<void> signOut() async => signedOut = true;
}

void main() {
  late FakeApi api;
  late FakeGoogle google;
  late AuthController auth;

  setUp(() {
    api = FakeApi();
    google = FakeGoogle();
    auth = AuthController(api, google);
  });

  group('Google でログイン', () {
    test('受け取った ID トークンをサーバーに渡してログインする', () async {
      api.choices = {1: true};
      expect(await auth.signInWithGoogle(), isNull);
      expect(api.googleIdToken, 'google-id-token');
      expect(auth.user?.email, 'taro@example.com');
      expect(auth.onboarded, isFalse);
    });

    test('途中でやめたら何も出さず、未ログインのまま', () async {
      google.token = null;
      expect(await auth.signInWithGoogle(), isNull);
      expect(api.googleIdToken, isNull);
      expect(auth.user, isNull);
    });

    test('サーバーが断ったらメッセージを返す', () async {
      api.signInError = ApiException(401, 'x');
      expect(await auth.signInWithGoogle(), googleErrorMessage);
      expect(auth.user, isNull);
    });

    test('端末側で失敗してもメッセージを返す', () async {
      google.fail = true;
      expect(await auth.signInWithGoogle(), googleErrorMessage);
    });

    test('ログアウトすると Google からもログアウトする', () async {
      await auth.signInWithGoogle();
      await auth.signOut();
      expect(google.signedOut, isTrue);
      expect(auth.user, isNull);
    });
  });

  test('ログインしていなければ、復元後は未ログイン', () async {
    await auth.restore();
    expect(auth.initialized, isTrue);
    expect(auth.user, isNull);
  });

  test('好みを伝え終えた人は、復元するとそのままホームへ進める', () async {
    api.session = taro;
    api.choices = {1: true, 2: false, 3: false};
    await auth.restore();
    expect(auth.user?.email, 'taro@example.com');
    expect(auth.onboarded, isTrue);
  });

  test('ログインしたら、好みが足りなければ冒頭文の画面へ', () async {
    api.choices = {1: true};
    final error = await auth.submit(
      AuthMode.signIn,
      ' Taro@Example.com ',
      'password123',
    );
    expect(error, isNull);
    expect(api.lastEmail, 'taro@example.com');
    expect(auth.onboarded, isFalse);
  });

  test('ログインに失敗したら日本語のメッセージを返す', () async {
    api.signInError = ApiException(401, 'x', code: 'INVALID_EMAIL_OR_PASSWORD');
    final error = await auth.submit(
      AuthMode.signIn,
      'taro@example.com',
      'wrong-password',
    );
    expect(error, 'メールアドレスかパスワードが違います。');
    expect(auth.user, isNull);
  });

  test('ログアウトすると未ログインに戻る', () async {
    await auth.submit(AuthMode.signUp, 'taro@example.com', 'password123');
    await auth.signOut();
    expect(auth.user, isNull);
    expect(auth.onboarded, isNull);
  });
}
