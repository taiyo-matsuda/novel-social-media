import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../widgets/app_button.dart';
import 'plot_request.dart';
import 'plot_request_field.dart';

/// 自分の作品を読み、「次はこうしてほしい」を伝えて続きの章をAIに書いてもらう画面。
/// 題名の変更と公開・非公開の切り替えもここで行う。
class WorkScreen extends StatefulWidget {
  const WorkScreen({super.key, required this.api, required this.workId});

  final ApiClient api;
  final String workId;

  @override
  State<WorkScreen> createState() => _WorkScreenState();
}

class _WorkScreenState extends State<WorkScreen> {
  final _request = TextEditingController();

  /// 書き上がった章まで画面を送るための目印
  final _latestChapterKey = GlobalKey();

  Work? _work;
  String? _loadError;
  String? _error;
  bool _generating = false;
  bool _updating = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _request.dispose();
    super.dispose();
  }

  Future<void> _load({bool scrollToLatest = false}) async {
    setState(() => _loadError = null);
    try {
      final work = await widget.api.fetchOwnWork(widget.workId);
      if (!mounted) return;
      setState(() => _work = work);
      if (scrollToLatest) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          final target = _latestChapterKey.currentContext;
          if (target != null && target.mounted) {
            Scrollable.ensureVisible(
              target,
              duration: const Duration(milliseconds: 400),
            );
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadError = '作品を読み込めませんでした。');
    }
  }

  Future<void> _generateNext() async {
    if (plotRequestError(_request.text) != null) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _generating = true;
      _error = null;
    });
    try {
      await widget.api.generateChapter(
        workId: widget.workId,
        plotRequest: _request.text,
      );
      _request.clear();
      if (!mounted) return;
      setState(() => _generating = false);
      await _load(scrollToLatest: true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _generating = false;
        _error = generationErrorMessage(e);
      });
    }
  }

  Future<void> _update({String? title, bool? published}) async {
    setState(() {
      _updating = true;
      _error = null;
    });
    try {
      await widget.api.updateWork(
        widget.workId,
        title: title,
        published: published,
      );
      await _load();
    } catch (_) {
      if (mounted) setState(() => _error = '変更を保存できませんでした。');
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<void> _editTitle(String current) async {
    final title = await showDialog<String>(
      context: context,
      builder: (_) => _TitleDialog(initial: current),
    );
    if (title != null && title != current) await _update(title: title);
  }

  Future<void> _togglePublished(bool published) async {
    if (!published) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('この作品を公開しますか'),
          content: const Text('公開すると、ほかの人も読めるようになります。あとで非公開に戻せます。'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('やめる'),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('公開する'),
            ),
          ],
        ),
      );
      if (ok != true) return;
    }
    await _update(published: !published);
  }

  @override
  Widget build(BuildContext context) {
    final work = _work;
    return Scaffold(
      appBar: AppBar(
        title: Text(work?.summary.title ?? ''),
        actions: [
          if (work != null)
            IconButton(
              tooltip: '題名を変える',
              icon: const Icon(Icons.edit_outlined),
              onPressed: _updating || _generating
                  ? null
                  : () => _editTitle(work.summary.title),
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

  Widget _buildWork(Work work) {
    final theme = Theme.of(context);
    final published = work.summary.published;
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(workStatusLabel(work.summary), style: theme.textTheme.bodySmall),
        const SizedBox(height: 8),
        for (final (i, chapter) in work.chapters.indexed)
          _ChapterView(
            key: i == work.chapters.length - 1 ? _latestChapterKey : null,
            chapter: chapter,
          ),
        const Divider(height: 48),
        Text(
          '続きを書いてもらう',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        PlotRequestField(
          controller: _request,
          enabled: !_generating,
          label: '次はこうしてほしい',
          hint: '例：店主の秘密を少しだけ明かしてほしい',
          suggestions: nextChapterSuggestions,
        ),
        const SizedBox(height: 16),
        if (_generating) ...[
          const GeneratingNotice(),
          const SizedBox(height: 16),
        ],
        if (_error != null) ...[
          Text(
            _error!,
            style: TextStyle(color: theme.colorScheme.error, fontSize: 15),
          ),
          const SizedBox(height: 16),
        ],
        ValueListenableBuilder(
          valueListenable: _request,
          builder: (context, value, _) => AppButton(
            label: '第${work.chapters.length + 1}章を書いてもらう',
            loading: _generating,
            onPressed: _updating || plotRequestError(value.text) != null
                ? null
                : _generateNext,
          ),
        ),
        const SizedBox(height: 12),
        AppButton(
          label: published ? '非公開にする' : 'この作品を公開する',
          primary: false,
          loading: _updating,
          onPressed: _generating ? null : () => _togglePublished(published),
        ),
      ],
    );
  }
}

class _ChapterView extends StatelessWidget {
  const _ChapterView({super.key, required this.chapter});

  final Chapter chapter;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '第${chapter.position}章　${chapter.title}',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          if (chapter.plotRequest != null) ...[
            const SizedBox(height: 8),
            Text(
              'あなたのリクエスト：${chapter.plotRequest}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
          ],
          const SizedBox(height: 16),
          SelectableText(
            chapter.body,
            // 冒頭文と同じく明朝体で読ませる
            style: const TextStyle(
              fontSize: 17,
              height: 1.9,
              fontFamily: 'Hiragino Mincho ProN',
              fontFamilyFallback: ['serif'],
            ),
          ),
        ],
      ),
    );
  }
}

/// 題名を変えるダイアログ。決定した題名（空白は取る）を返す
class _TitleDialog extends StatefulWidget {
  const _TitleDialog({required this.initial});

  final String initial;

  @override
  State<_TitleDialog> createState() => _TitleDialogState();
}

class _TitleDialogState extends State<_TitleDialog> {
  late final _controller = TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('題名を変える'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        maxLength: 100,
        decoration: const InputDecoration(labelText: '題名'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('やめる'),
        ),
        ValueListenableBuilder(
          valueListenable: _controller,
          builder: (context, value, _) => TextButton(
            onPressed: value.text.trim().isEmpty
                ? null
                : () => Navigator.of(context).pop(value.text.trim()),
            child: const Text('保存'),
          ),
        ),
      ],
    );
  }
}
