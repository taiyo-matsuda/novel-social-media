import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../widgets/app_button.dart';
import 'deck.dart';

/// 最初の画面：短い冒頭文を1つずつ見せて「読みたい／読みたくない」を選んでもらう。
/// 選んだ結果は AI が第1章を書くときの手がかりになる。
class OpeningsScreen extends StatefulWidget {
  const OpeningsScreen({super.key, required this.api, required this.onFinish});

  final ApiClient api;

  /// 「この好みで始める」を押したとき
  final Future<void> Function() onFinish;

  @override
  State<OpeningsScreen> createState() => _OpeningsScreenState();
}

class _OpeningsScreenState extends State<OpeningsScreen> {
  List<Opening>? _openings;
  OpeningChoices _choices = {};
  String? _error;
  bool _finishing = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final results = await Future.wait([
        widget.api.fetchOpenings(),
        widget.api.fetchOwnChoices(),
      ]);
      if (!mounted) return;
      setState(() {
        _openings = results[0] as List<Opening>;
        _choices = results[1] as OpeningChoices;
      });
    } catch (_) {
      if (mounted) setState(() => _error = '冒頭文を読み込めませんでした。');
    }
  }

  Future<void> _choose(Opening opening, bool wantsToRead) async {
    final before = _choices;
    // 待たせないよう先に画面を進め、保存に失敗したら戻す
    setState(() => _choices = {...before, opening.id: wantsToRead});
    try {
      await widget.api.saveChoice(opening.id, wantsToRead);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _choices = before;
        _error = '保存できませんでした。もう一度選んでください。';
      });
    }
  }

  Future<void> _startOver() async {
    try {
      await widget.api.clearChoices();
      if (!mounted) return;
      setState(() {
        _choices = {};
        _error = null;
      });
    } catch (_) {
      if (mounted) setState(() => _error = '選び直しの準備ができませんでした。');
    }
  }

  Future<void> _finish() async {
    setState(() => _finishing = true);
    await widget.onFinish();
    if (mounted) setState(() => _finishing = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('好みを教えてください')),
      body: SafeArea(
        child: _openings == null ? _buildLoading() : _buildDeck(_openings!),
      ),
    );
  }

  Widget _buildLoading() {
    if (_error == null) return const Center(child: CircularProgressIndicator());
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 16),
            AppButton(label: 'もう一度読み込む', onPressed: _load),
          ],
        ),
      ),
    );
  }

  Widget _buildDeck(List<Opening> openings) {
    final theme = Theme.of(context);
    final current = nextOpening(openings, _choices);
    final answered = _choices.length.clamp(0, openings.length);
    final ready = canFinish(_choices);

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          '書き出しを読んで、続きを読みたいかどうかを選んでください。$minChoicesつ以上選ぶと始められます。',
          style: const TextStyle(fontSize: 15, height: 1.6),
        ),
        const SizedBox(height: 8),
        Text(
          '$answered / ${openings.length}　・　読みたい ${likedCount(_choices)}',
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 16),
        if (current != null) ...[
          _OpeningCard(opening: current),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: AppButton(
                  label: '読みたくない',
                  primary: false,
                  onPressed: () => _choose(current, false),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: AppButton(
                  label: '読みたい',
                  onPressed: () => _choose(current, true),
                ),
              ),
            ],
          ),
        ] else
          Text(
            isStuck(openings, _choices)
                ? '今回は読みたい書き出しがありませんでした。もう一度見直してみてください。'
                : 'すべての書き出しを選び終えました。',
            style: const TextStyle(fontSize: 16, height: 1.6),
          ),
        if (_error != null) ...[
          const SizedBox(height: 16),
          Text(
            _error!,
            style: TextStyle(color: theme.colorScheme.error, fontSize: 15),
          ),
        ],
        if (ready) ...[
          const SizedBox(height: 16),
          AppButton(
            label: 'この好みで始める',
            primary: current == null,
            loading: _finishing,
            onPressed: _finish,
          ),
        ],
        if (current == null) ...[
          const SizedBox(height: 16),
          AppButton(label: '最初から選び直す', primary: false, onPressed: _startOver),
        ],
      ],
    );
  }
}

class _OpeningCard extends StatelessWidget {
  const _OpeningCard({required this.opening});

  final Opening opening;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 220),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (opening.genre != null) ...[
                Text(
                  opening.genre!,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 12),
              ],
              Text(
                opening.text,
                // 小説らしく明朝体で見せる（iOS はヒラギノ明朝、ほかは端末の serif）
                style: const TextStyle(
                  fontSize: 19,
                  height: 1.8,
                  fontFamily: 'Hiragino Mincho ProN',
                  fontFamilyFallback: ['serif'],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
