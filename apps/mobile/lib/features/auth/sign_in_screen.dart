import 'package:flutter/material.dart';

import '../../widgets/app_button.dart';
import 'auth_controller.dart';

/// Google でログインする（初めてなら登録される）。メールアドレスでの登録・ログインはない。
/// 成功するとログイン状態が変わり、main.dart が次の画面へ切り替える。
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  bool _busy = false;
  String? _error;

  Future<void> _signInWithGoogle() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final error = await widget.auth.signInWithGoogle();
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = error;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'あなた専用の小説を、AIが書きます',
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  '好みを伝えると、AIがあなただけの小説を書きます。気に入った作品は公開して、ほかの人の作品も読めます。',
                  style: theme.textTheme.bodyLarge?.copyWith(height: 1.6),
                ),
                const SizedBox(height: 32),
                AppButton(
                  label: 'Googleで続ける',
                  loading: _busy,
                  onPressed: _signInWithGoogle,
                ),
                const SizedBox(height: 8),
                Text(
                  'はじめての方も、そのまま登録して始められます。',
                  style: theme.textTheme.bodySmall,
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _error!,
                    style: TextStyle(
                      color: theme.colorScheme.error,
                      fontSize: 15,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
