import 'package:flutter/material.dart';

import '../../widgets/app_button.dart';
import 'auth_controller.dart';
import 'validation.dart';

/// メールアドレスとパスワードで登録・ログインする。確認メールは送らない。
/// 成功するとログイン状態が変わり、main.dart が次の画面へ切り替える。
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  AuthMode _mode = AuthMode.signUp;
  bool _busy = false;
  bool _googleBusy = false;

  /// メールアドレスでの登録・ログイン欄を開いているか
  bool _showEmail = false;
  String? _error;

  bool get _canSubmit =>
      isValidEmail(_email.text) && isValidPassword(_password.text);

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canSubmit || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final error = await widget.auth.submit(_mode, _email.text, _password.text);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = error;
    });
  }

  Future<void> _signInWithGoogle() async {
    if (_googleBusy) return;
    setState(() {
      _googleBusy = true;
      _error = null;
    });
    final error = await widget.auth.signInWithGoogle();
    if (!mounted) return;
    setState(() {
      _googleBusy = false;
      _error = error;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final signUp = _mode == AuthMode.signUp;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: AutofillGroup(
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
                    loading: _googleBusy,
                    onPressed: _signInWithGoogle,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'はじめての方も、そのまま登録して始められます。',
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  if (!_showEmail)
                    TextButton(
                      onPressed: () => setState(() {
                        _showEmail = true;
                        _error = null;
                      }),
                      child: const Text('メールアドレスで続ける'),
                    ),
                  if (_showEmail) ...[
                    const SizedBox(height: 8),
                    SegmentedButton<AuthMode>(
                      segments: const [
                        ButtonSegment(
                          value: AuthMode.signUp,
                          label: Text('はじめての方'),
                        ),
                        ButtonSegment(
                          value: AuthMode.signIn,
                          label: Text('ログイン'),
                        ),
                      ],
                      selected: {_mode},
                      showSelectedIcon: false,
                      onSelectionChanged: (s) => setState(() {
                        _mode = s.first;
                        _error = null;
                      }),
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _email,
                      decoration: const InputDecoration(
                        labelText: 'メールアドレス',
                        hintText: 'you@example.com',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      autofillHints: const [AutofillHints.email],
                      textInputAction: TextInputAction.next,
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _password,
                      decoration: const InputDecoration(
                        labelText: 'パスワード',
                        hintText: '$minPasswordLength文字以上',
                        border: OutlineInputBorder(),
                      ),
                      obscureText: true,
                      autocorrect: false,
                      autofillHints: [
                        signUp
                            ? AutofillHints.newPassword
                            : AutofillHints.password,
                      ],
                      textInputAction: TextInputAction.go,
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _submit(),
                    ),
                    if (signUp) ...[
                      const SizedBox(height: 8),
                      Text(
                        '確認メールは届きません。登録するとすぐに始められます。',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                    const SizedBox(height: 24),
                    AppButton(
                      label: signUp ? '登録して始める' : 'ログイン',
                      onPressed: _canSubmit ? _submit : null,
                      loading: _busy,
                    ),
                  ],
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
      ),
    );
  }
}
