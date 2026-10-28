import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import 'reading.dart';
import 'reading_screen.dart';

/// みんなの公開作品をランキング順に並べる画面
class PublicWorksScreen extends StatefulWidget {
  const PublicWorksScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<PublicWorksScreen> createState() => _PublicWorksScreenState();
}

class _PublicWorksScreenState extends State<PublicWorksScreen> {
  List<PublicWorkSummary>? _works;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final works = await widget.api.fetchPublicWorks();
      if (mounted) setState(() => _works = works);
    } catch (_) {
      if (mounted) setState(() => _error = '作品の一覧を読み込めませんでした。');
    }
  }

  /// 読む画面を開き、戻ってきたら一覧を読み直す（高評価や読んだ人数が変わっているため）
  Future<void> _open(PublicWorkSummary work) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ReadingScreen(api: widget.api, workId: work.id),
      ),
    );
    if (mounted) await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('みんなの作品')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: _buildWorks(Theme.of(context)),
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
        Padding(
          padding: EdgeInsets.all(8),
          child: Text(
            'まだ公開された作品はありません。あなたの作品を公開して、最初の作者になりましょう。',
            style: TextStyle(fontSize: 15, height: 1.6),
          ),
        ),
      ];
    }
    return [
      for (final (i, work) in works.indexed)
        Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Text(
              '${i + 1}',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: theme.colorScheme.primary,
              ),
            ),
            title: Text(work.title),
            subtitle: Text(publicWorkLabel(work)),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _open(work),
          ),
        ),
    ];
  }
}
