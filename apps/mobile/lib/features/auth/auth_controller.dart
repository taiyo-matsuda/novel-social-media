import 'package:flutter/foundation.dart';

import '../../services/api_client.dart';
import '../openings/deck.dart';
import 'validation.dart';

enum AuthMode { signUp, signIn }

/// 表示名の初期値。あとでプロフィール画面から変えられるようにする
const defaultName = '読者';

/// ログイン状態と「好みを伝え終えたか」を持つ。どの画面を見せるかは main.dart がこれを見て決める。
class AuthController extends ChangeNotifier {
  AuthController(this._api);

  final ApiClient _api;

  /// 起動時にログイン状態を読み込み終えたか
  bool initialized = false;
  SessionUser? user;

  /// 冒頭文で好みを伝え終えたか。確認中は null
  bool? onboarded;

  /// 起動時に、保存してあるトークンでログイン状態を復元する
  Future<void> restore() async {
    try {
      user = await _api.getSession();
    } catch (_) {
      // 通信できなければ未ログインとして始める（ログイン画面からやり直せる）
      user = null;
    }
    initialized = true;
    notifyListeners();
    if (user != null) await refreshOnboarded();
  }

  /// 登録またはログインする。失敗したら画面に出す文を返す
  Future<String?> submit(AuthMode mode, String email, String password) async {
    final normalized = normalizeEmail(email);
    try {
      user = mode == AuthMode.signUp
          ? await _api.signUp(
              email: normalized,
              password: password,
              name: defaultName,
            )
          : await _api.signIn(email: normalized, password: password);
    } on ApiException catch (e) {
      return authErrorMessage(code: e.code, status: e.status);
    } catch (_) {
      return authErrorMessage();
    }
    onboarded = null;
    notifyListeners();
    await refreshOnboarded();
    return null;
  }

  /// 冒頭文を選び終えたあとに呼び、onboarded を取り直す
  Future<void> refreshOnboarded() async {
    final userId = user?.id;
    if (userId == null) return;
    bool result;
    try {
      result = canFinish(await _api.fetchOwnChoices());
    } catch (_) {
      // 確認できなければ冒頭文の画面へ（進んでも害はない）
      result = false;
    }
    // 確認中にログアウトしていたら捨てる
    if (user?.id != userId) return;
    onboarded = result;
    notifyListeners();
  }

  Future<void> signOut() async {
    try {
      await _api.signOut();
    } catch (_) {
      // 端末のトークンは消えているので、画面はログアウトした状態にする
    }
    user = null;
    onboarded = null;
    notifyListeners();
  }
}
