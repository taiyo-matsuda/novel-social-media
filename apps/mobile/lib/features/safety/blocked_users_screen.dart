import 'package:flutter/material.dart';

import '../../services/api_client.dart';

/// ブロックした人の一覧。ここから解除できる
class BlockedUsersScreen extends StatefulWidget {
  const BlockedUsersScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<BlockedUsersScreen> createState() => _BlockedUsersScreenState();
}

class _BlockedUsersScreenState extends State<BlockedUsersScreen> {
  List<BlockedUser>? _blocks;
  String? _error;

  /// 解除の通信中の利用者ID
  final _unblocking = <String>{};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final blocks = await widget.api.fetchBlocks();
      if (mounted) setState(() => _blocks = blocks);
    } catch (_) {
      if (mounted) setState(() => _error = 'ブロックした人を読み込めませんでした。');
    }
  }

  Future<void> _unblock(BlockedUser user) async {
    setState(() => _unblocking.add(user.userId));
    try {
      await widget.api.unblock(user.userId);
      if (mounted) {
        setState(
          () => _blocks = [
            for (final b in _blocks ?? <BlockedUser>[])
              if (b.userId != user.userId) b,
          ],
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('解除できませんでした。')));
      }
    } finally {
      if (mounted) setState(() => _unblocking.remove(user.userId));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ブロックした人')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: _buildBlocks(Theme.of(context)),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildBlocks(ThemeData theme) {
    if (_error != null) {
      return [
        Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
        TextButton(onPressed: _load, child: const Text('もう一度読み込む')),
      ];
    }
    final blocks = _blocks;
    if (blocks == null) {
      return const [
        Padding(
          padding: EdgeInsets.all(16),
          child: Center(child: CircularProgressIndicator()),
        ),
      ];
    }
    if (blocks.isEmpty) {
      return const [
        Padding(
          padding: EdgeInsets.all(8),
          child: Text(
            'ブロックしている人はいません。作品を読む画面の右上のメニューから、作者をブロックできます。',
            style: TextStyle(fontSize: 15, height: 1.6),
          ),
        ),
      ];
    }
    return [
      for (final user in blocks)
        Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            title: Text(user.name),
            trailing: OutlinedButton(
              onPressed: _unblocking.contains(user.userId)
                  ? null
                  : () => _unblock(user),
              child: const Text('解除'),
            ),
          ),
        ),
    ];
  }
}
