import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../widgets/app_button.dart';
import 'reading.dart';

/// ほかの人の公開作品を1章ずつ読む画面。高評価もここで付ける。
/// 章を開いたら「読み始めた」、終わりまで送ったら「読み終えた」をサーバーに記録する
class ReadingScreen extends StatefulWidget {
  const ReadingScreen({super.key, required this.api, required this.workId});

  final ApiClient api;
  final String workId;

  @override
  State<ReadingScreen> createState() => _ReadingScreenState();
}

class _ReadingScreenState extends State<ReadingScreen> {
  final _scroll = ScrollController();
  final _tracker = ReadTracker();

  PublicWork? _work;
  String? _loadError;

  /// いま読んでいる章（0 始まり）
  int _index = 0;
  bool _liked = false;
  int _likes = 0;
  bool _liking = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loadError = null);
    try {
      final work = await widget.api.fetchPublicWork(widget.workId);
      if (!mounted) return;
      setState(() {
        _work = work;
        _liked = work.likedByMe;
        _likes = work.summary.likes;
      });
      _onChapterShown();
    } catch (e) {
      if (!mounted) return;
      setState(
        () => _loadError = e is ApiException && e.status == 404
            ? 'この作品は非公開になったか、削除されました。'
            : '作品を読み込めませんでした。',
      );
    }
  }

  /// 読んだ記録を送る。自分の作品の読み返しは送らない。失敗しても読むのは邪魔しない
  void _record(int position, ReadKind kind) {
    final work = _work;
    if (work == null || work.isMine || !_tracker.mark(position, kind)) return;
    widget.api.recordRead(widget.workId, position, kind).catchError((_) {});
  }

  /// 章を表示したら「読み始めた」を送り、画面に収まる短い章ならそのまま「読み終えた」も送る
  void _onChapterShown() {
    final work = _work;
    if (work == null || work.chapters.isEmpty) return;
    _record(work.chapters[_index].position, ReadKind.start);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _scroll.hasClients) _checkEnd(_scroll.position);
    });
  }

  void _checkEnd(ScrollMetrics metrics) {
    final work = _work;
    if (work == null || !reachedChapterEnd(metrics)) return;
    _record(work.chapters[_index].position, ReadKind.complete);
  }

  void _goTo(int index) {
    setState(() => _index = index);
    if (_scroll.hasClients) _scroll.jumpTo(0);
    _onChapterShown();
  }

  Future<void> _toggleLike() async {
    final next = !_liked;
    setState(() => _liking = true);
    try {
      final likes = await widget.api.setLike(widget.workId, liked: next);
      if (mounted) {
        setState(() {
          _liked = next;
          _likes = likes;
        });
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('高評価を保存できませんでした。')));
      }
    } finally {
      if (mounted) setState(() => _liking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final work = _work;
    return Scaffold(
      appBar: AppBar(
        title: Text(work?.summary.title ?? ''),
        actions: [
          if (work != null && !work.isMine)
            IconButton(
              tooltip: _liked ? '高評価を外す' : '高評価を付ける',
              icon: Icon(_liked ? Icons.favorite : Icons.favorite_border),
              onPressed: _liking ? null : _toggleLike,
            ),
        ],
      ),
      body: SafeArea(child: work == null ? _buildLoading() : _buildWork(work)),
    );
  }

  Widget _buildLoading() {
    if (_loadError == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_loadError!, style: const TextStyle(fontSize: 16)),
            const SizedBox(height: 16),
            AppButton(label: 'もう一度読み込む', onPressed: _load),
          ],
        ),
      ),
    );
  }

  Widget _buildWork(PublicWork work) {
    final theme = Theme.of(context);
    if (work.chapters.isEmpty) {
      return const Center(child: Text('まだ章がありません。'));
    }
    final chapter = work.chapters[_index];
    final isLast = _index == work.chapters.length - 1;
    return NotificationListener<ScrollNotification>(
      onNotification: (n) {
        _checkEnd(n.metrics);
        return false;
      },
      child: ListView(
        controller: _scroll,
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            [
              '作：${work.summary.authorName}',
              if (work.isMine) 'あなたの作品',
              if (_likes > 0) '高評価 $_likes',
            ].join('・'),
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 24),
          Text(
            '第${chapter.position}章　${chapter.title}',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          SelectableText(
            chapter.body,
            // 自分の作品の画面と同じく明朝体で読ませる
            style: const TextStyle(
              fontSize: 17,
              height: 1.9,
              fontFamily: 'Hiragino Mincho ProN',
              fontFamilyFallback: ['serif'],
            ),
          ),
          const Divider(height: 48),
          Text(
            '${chapter.position} / ${work.chapters.length} 章',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          if (!isLast)
            AppButton(
              label: '第${work.chapters[_index + 1].position}章へ',
              onPressed: () => _goTo(_index + 1),
            )
          else if (!work.isMine) ...[
            Text(
              'ここまで公開されています。面白かったら高評価で作者に伝えましょう。',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            AppButton(
              label: _liked ? '高評価を付けました' : '高評価を付ける',
              primary: !_liked,
              loading: _liking,
              onPressed: _toggleLike,
            ),
          ],
          if (_index > 0) ...[
            const SizedBox(height: 12),
            AppButton(
              label: '前の章へ',
              primary: false,
              onPressed: () => _goTo(_index - 1),
            ),
          ],
        ],
      ),
    );
  }
}
