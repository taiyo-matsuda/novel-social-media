import 'package:flutter/material.dart';

import '../../widgets/app_button.dart';
import '../auth/auth_controller.dart';

/// 好みを伝え終えた人のホーム。小説を書く画面は次に作る。
class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.auth,
    required this.onChooseAgain,
  });

  final AuthController auth;

  /// 「好みを選び直す」を押したとき
  final VoidCallback onChooseAgain;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Tsuzuri')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              '好みを受け取りました',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              '選んでもらった書き出しをもとに、AIがあなた専用の小説を書きます。小説を書く画面は次に作ります。',
              style: TextStyle(fontSize: 16, height: 1.6),
            ),
            const SizedBox(height: 16),
            AppButton(
              label: '好みを選び直す',
              primary: false,
              onPressed: onChooseAgain,
            ),
            const SizedBox(height: 40),
            Text(
              '${auth.user?.email ?? ''} でログイン中',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            AppButton(label: 'ログアウト', primary: false, onPressed: auth.signOut),
          ],
        ),
      ),
    );
  }
}
