import 'package:flutter_test/flutter_test.dart';
import 'package:novel_sns/features/auth/auth_controller.dart';
import 'package:novel_sns/services/api_client.dart';
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

  @override
  Future<void> signOut() async => session = null;

  @override
  Future<Map<int, bool>> fetchOwnChoices() async => choices;

  @override
  Future<void> deleteAccount(String password) async {
    if (password != 'password123') {
      throw ApiException(400, 'Invalid password', code: 'INVALID_PASSWORD');
    }
    session = null;
  }
}

void main() {
  late FakeApi api;
  late AuthController auth;

  setUp(() {
    api = FakeApi();
    auth = AuthController(api);
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
}
