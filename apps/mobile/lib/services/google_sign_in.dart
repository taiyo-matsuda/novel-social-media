import 'package:google_sign_in/google_sign_in.dart';

import 'config.dart';

/// 端末で Google にログインして ID トークンを受け取る。テストでは偽物に差し替える。
abstract class GoogleIdTokenSource {
  /// Google のログイン画面を出し、ID トークンを返す。利用者がやめたら null
  Future<String?> signIn();

  Future<void> signOut();
}

/// google_sign_in プラグインを使う本物。ID トークンの宛先はサーバー用（Web）のクライアントIDになる
class PluginGoogleIdTokenSource implements GoogleIdTokenSource {
  Future<void>? _initialized;

  Future<void> _initialize() =>
      _initialized ??= GoogleSignIn.instance.initialize(
        clientId: googleIosClientId.isEmpty ? null : googleIosClientId,
        serverClientId: googleServerClientId.isEmpty
            ? null
            : googleServerClientId,
      );

  @override
  Future<String?> signIn() async {
    await _initialize();
    try {
      final account = await GoogleSignIn.instance.authenticate();
      return account.authentication.idToken;
    } on GoogleSignInException catch (e) {
      if (e.code == GoogleSignInExceptionCode.canceled) return null;
      rethrow;
    }
  }

  @override
  Future<void> signOut() async {
    await _initialize();
    await GoogleSignIn.instance.signOut();
  }
}
