import 'package:flutter_test/flutter_test.dart';
import 'package:ballad/features/auth/auth_controller.dart';
import 'package:ballad/features/auth/auth_messages.dart';
import 'package:ballad/services/api_client.dart';
import 'package:ballad/services/google_sign_in.dart';
import 'package:ballad/services/token_store.dart';

const taro = SessionUser(id: 'u1', email: 'taro@example.com', name: '読者');

/// サーバーを呼ばない ApiClient
class FakeApi extends ApiClient {
  FakeApi() : super(baseUrl: 'http://api.test', tokens: MemoryTokenStore());

  SessionUser? session;
  Map<int, bool> choices = {};
  ApiException? signInError;

  @override
  Future<SessionUser?> getSession() async => session;

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

  /// Google でログインし直したあと（ログイン状態が新しい）か
  bool freshSession = false;

  /// signInWithGoogle で返す利用者（別のアカウントを選んだ場合を試す）
  SessionUser googleUser = taro;

  @override
  Future<void> deleteAccount() async {
    if (!freshSession) {
      throw ApiException(400, 'Session expired', code: 'SESSION_EXPIRED');
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

    test('試行が続いて断られたら、時間をおくよう伝える', () async {
      api.signInError = ApiException(429, 'Too many requests');
      expect(await auth.signInWithGoogle(), tooManyAttemptsMessage);
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

  test('ログアウトすると未ログインに戻る', () async {
    await auth.signInWithGoogle();
    await auth.signOut();
    expect(auth.user, isNull);
    expect(auth.onboarded, isNull);
  });

  group('退会', () {
    setUp(() async {
      await auth.signInWithGoogle();
      api.freshSession = false;
    });

    test('Google でログインし直してから退会し、未ログインに戻る', () async {
      expect(await auth.deleteAccountWithGoogle(), isNull);
      expect(api.freshSession, isTrue);
      expect(auth.user, isNull);
      expect(google.signedOut, isTrue);
      expect(auth.onboarded, isNull);
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
