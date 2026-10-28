import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../widgets/app_button.dart';
import '../auth/auth_controller.dart';
import '../safety/blocked_users_screen.dart';
import '../safety/delete_account_screen.dart';
import '../writing/new_work_screen.dart';
import '../writing/plot_request.dart';
import '../writing/work_screen.dart';

/// 好みを伝え終えた人のホーム。新しい小説を書いてもらう入口と、自分の作品の一覧
class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.api,
    required this.auth,
    required this.onChooseAgain,
  });

  final ApiClient api;
  final AuthController auth;

  /// 「好みを選び直す」を押したとき
  final VoidCallback onChooseAgain;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<WorkSummary>? _works;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final works = await widget.api.fetchOwnWorks();
      if (mounted) setState(() => _works = works);
    } catch (_) {
      if (mounted) setState(() => _error = '作品の一覧を読み込めませんでした。');
    }
  }

  /// 画面を開き、戻ってきたら一覧を読み直す（章や公開状態が変わっているため）
  Future<void> _open(Widget screen) async {
    await Navigator.of(context)
        .push(MaterialPageRoute<void>(builder: (_) => screen));
    if (mounted) await _load();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = widget.auth;
    return Scaffold(
      appBar: AppBar(title: const Text('Tsuzuri')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              AppButton(
                label: '新しい小説を書いてもらう',
                onPressed: () => _open(NewWorkScreen(api: widget.api)),
              ),
              const SizedBox(height: 32),
              Text(
                'あなたの作品',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              ..._buildWorks(theme),
              const SizedBox(height: 40),
              AppButton(
                label: '好みを選び直す',
                primary: false,
                onPressed: widget.onChooseAgain,
              ),
              const SizedBox(height: 24),
              Text(
                '${auth.user?.email ?? ''} でログイン中',
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              AppButton(
                label: 'ログアウト',
                primary: false,
                onPressed: auth.signOut,
              ),
              const SizedBox(height: 24),
              TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => BlockedUsersScreen(api: widget.api),
                  ),
                ),
                child: const Text('ブロックした人'),
              ),
              TextButton(
                style: TextButton.styleFrom(
                  foregroundColor: theme.colorScheme.error,
                ),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => DeleteAccountScreen(
                      auth: auth,
                      hasPassword: widget.api.hasPassword,
                    ),
                  ),
                ),
                child: const Text('アカウントを削除'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildWorks(ThemeData theme) {
    if (_error != null) {
      return [
        Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
        TextButton(onPressed: _load, child: const Text('もう一度読み込む')),
      ];
    }
    final works = _works;
    if (works == null) {
      return const [
        Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator()),
        ),
      ];
    }
    if (works.isEmpty) {
      return const [
        Text(
          'まだ作品はありません。上のボタンから、AIに第1章を書いてもらいましょう。',
          style: TextStyle(fontSize: 15, height: 1.6),
        ),
      ];
    }
    return [
      for (final work in works)
        Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            title: Text(work.title),
            subtitle: Text(workStatusLabel(work)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _open(WorkScreen(api: widget.api, workId: work.id)),
          ),
        ),
    ];
  }
}
