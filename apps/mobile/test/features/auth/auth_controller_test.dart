import 'package:flutter_test/flutter_test.dart';
import 'package:tsuzuri/features/auth/auth_controller.dart';
import 'package:tsuzuri/features/auth/validation.dart';
import 'package:tsuzuri/services/api_client.dart';
import 'package:tsuzuri/services/google_sign_in.dart';
import 'package:tsuzuri/services/token_store.dart';

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
    freshSession = true;
    return session = googleUser;
  }

  @override
  Future<void> signOut() async => session = null;

  @override
  Future<Map<int, bool>> fetchOwnChoices() async => choices;

  /// パスワードでログインできるアカウントか
  bool passwordAccount = true;

  /// Google でログインし直したあと（ログイン状態が新しい）か
  bool freshSession = false;

  /// signInWithGoogle で返す利用者（別のアカウントを選んだ場合を試す）
  SessionUser googleUser = taro;

  @override
  Future<bool> hasPassword() async => passwordAccount;

  @override
  Future<void> deleteAccount({String? password}) async {
    if (password == null) {
      if (!freshSession) {
        throw ApiException(400, 'Session expired', code: 'SESSION_EXPIRED');
      }
    } else if (password != 'password123') {
      throw ApiException(400, 'Invalid password', code: 'INVALID_PASSWORD');
    }
    deleted = true;
    session = null;
  }

  bool deleted = false;
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

  test('退会はパスワードが違えば理由を返し、できたら未ログインに戻る', () async {
    await auth.submit(AuthMode.signUp, 'taro@example.com', 'password123');
    expect(await auth.deleteAccount('wrong'), 'パスワードが違います。');
    expect(auth.user, isNotNull);

    expect(await auth.deleteAccount('password123'), isNull);
    expect(auth.user, isNull);
    expect(auth.onboarded, isNull);
  });

  group('Google の人の退会', () {
    setUp(() async {
      await auth.signInWithGoogle();
      api.passwordAccount = false;
      api.freshSession = false;
    });

    test('Google でログインし直してから、パスワードなしで退会する', () async {
      expect(await auth.deleteAccountWithGoogle(), isNull);
      expect(api.freshSession, isTrue);
      expect(auth.user, isNull);
      expect(google.signedOut, isTrue);
    });

    test('Google の画面でやめたら何もしない', () async {
      google.token = null;
      expect(await auth.deleteAccountWithGoogle(), deleteCanceled);
      expect(auth.user, isNotNull);
    });

    test('別の Google アカウントを選んだら退会せずログアウトする', () async {
      api.googleUser = const SessionUser(
        id: 'u2',
        email: 'other@example.com',
        name: '読者',
      );
      final error = await auth.deleteAccountWithGoogle();
      expect(error, contains('別の Google アカウント'));
      expect(api.deleted, isFalse);
      expect(auth.user, isNull);
    });
  });
}
