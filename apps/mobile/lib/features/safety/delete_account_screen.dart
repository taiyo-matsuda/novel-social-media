import 'package:flutter/material.dart';

import '../../widgets/app_button.dart';
import '../auth/auth_controller.dart';

/// 退会の画面。もう一度確かめてから、Google でログインし直して本人か確かめて消す
class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key, required this.auth});

  final AuthController auth;

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  bool _deleting = false;
  String? _error;

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
    final error = await widget.auth.deleteAccountWithGoogle();
    if (!mounted) return;
    if (error == deleteCanceled) {
      setState(() => _deleting = false);
      return;
    }
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
            const Text(
              '本人確認のため、「退会する」を押すと Google のログイン画面が開きます。いまログインしているアカウントを選んでください。',
              style: TextStyle(fontSize: 15, height: 1.6),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
            ],
            const SizedBox(height: 24),
            AppButton(label: '退会する', loading: _deleting, onPressed: _delete),
          ],
        ),
      ),
    );
  }
}
