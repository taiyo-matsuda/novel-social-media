import 'package:flutter/material.dart';

import '../../widgets/app_button.dart';
import '../auth/auth_controller.dart';

/// 退会の画面。パスワードを入れ直してもらい、もう一度確かめてから消す
class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  final _password = TextEditingController();
  bool _deleting = false;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('本当に退会しますか？'),
        content: const Text('あなたの作品と記録はすべて消え、元に戻せません。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('やめる'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
              foregroundColor: Theme.of(context).colorScheme.onError,
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('退会する'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() {
      _deleting = true;
      _error = null;
    });
    final error = await widget.auth.deleteAccount(_password.text);
    if (!mounted) return;
    if (error != null) {
      setState(() {
        _deleting = false;
        _error = error;
      });
      return;
    }
    // ログイン画面は main.dart が出すので、重ねて開いた画面を閉じる
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('アカウントを削除')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text(
              '退会すると、あなたが書いてもらった作品（公開中のものも含む）、好み、読んだ記録、高評価、ブロックがすべて削除されます。元に戻すことはできません。',
              style: TextStyle(fontSize: 15, height: 1.6),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _password,
              obscureText: true,
              autofillHints: const [AutofillHints.password],
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'パスワード',
                helperText: '確認のため、ログインに使うパスワードを入力してください',
                border: OutlineInputBorder(),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
            ],
            const SizedBox(height: 24),
            AppButton(
              label: '退会する',
              loading: _deleting,
              onPressed: _password.text.isEmpty ? null : _delete,
            ),
          ],
        ),
      ),
    );
  }
}
