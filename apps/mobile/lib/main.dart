import 'package:flutter/material.dart';

import 'features/auth/auth_controller.dart';
import 'features/auth/sign_in_screen.dart';
import 'features/home/home_screen.dart';
import 'features/openings/openings_screen.dart';
import 'services/api_client.dart';
import 'services/config.dart';
import 'services/google_sign_in.dart';
import 'services/token_store.dart';

void main() {
  final api = ApiClient(baseUrl: apiUrl, tokens: SecureTokenStore());
  final auth = AuthController(api, PluginGoogleIdTokenSource())..restore();
  runApp(NovelApp(api: api, auth: auth));
}

class NovelApp extends StatelessWidget {
  const NovelApp({super.key, required this.api, required this.auth});

  final ApiClient api;
  final AuthController auth;

  @override
  Widget build(BuildContext context) {
    const seed = Color(0xFF3D5A80);
    return MaterialApp(
      title: 'AI小説SNS',
      theme: ThemeData(colorSchemeSeed: seed),
      darkTheme: ThemeData(colorSchemeSeed: seed, brightness: Brightness.dark),
      home: ListenableBuilder(
        listenable: auth,
        builder: (context, _) => _root(context),
      ),
    );
  }

  /// ログイン状態で見せる画面を切り替える。
  /// - 未ログイン：ログイン画面
  /// - ログイン済みで好みが未入力：冒頭文の画面
  /// - 好みを伝え終えた：ホーム（冒頭文の画面はホームから選び直しに使う）
  Widget _root(BuildContext context) {
    if (!auth.initialized) return const _Loading();
    if (auth.user == null) return SignInScreen(auth: auth);
    return switch (auth.onboarded) {
      null => const _Loading(),
      false => OpeningsScreen(api: api, onFinish: auth.refreshOnboarded),
      true => HomeScreen(
        auth: auth,
        onChooseAgain: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (context) => OpeningsScreen(
              api: api,
              onFinish: () async {
                await auth.refreshOnboarded();
                if (context.mounted) Navigator.of(context).pop();
              },
            ),
          ),
        ),
      ),
    };
  }
}

/// ログイン状態や好みを確認している間に出す画面
class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) =>
      const Scaffold(body: Center(child: CircularProgressIndicator()));
}
