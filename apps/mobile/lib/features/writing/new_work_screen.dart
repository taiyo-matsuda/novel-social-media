import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../widgets/app_button.dart';
import 'plot_request.dart';
import 'plot_request_field.dart';
import 'work_screen.dart';

/// 新しい小説の第1章をAIに書いてもらう画面。
/// 冒頭文で選んだ好みに加えて、「こんな話が読みたい」を任意で伝えられる。
class NewWorkScreen extends StatefulWidget {
  const NewWorkScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<NewWorkScreen> createState() => _NewWorkScreenState();
}

class _NewWorkScreenState extends State<NewWorkScreen> {
  final _request = TextEditingController();
  bool _generating = false;
  String? _error;

  @override
  void dispose() {
    _request.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    if (plotRequestError(_request.text) != null) return;
    setState(() {
      _generating = true;
      _error = null;
    });
    try {
      final result = await widget.api.generateChapter(
        plotRequest: _request.text,
      );
      if (!mounted) return;
      // 書き上がったら作品の画面に切り替える（戻るとホームに帰る）
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => WorkScreen(api: widget.api, workId: result.workId),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _generating = false;
        _error = generationErrorMessage(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('新しい小説')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              'AIがあなた専用の小説を書きます',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              '選んでもらった書き出しをもとに第1章を書きます。読みたい話があれば書いてください。',
              style: TextStyle(fontSize: 15, height: 1.6),
            ),
            const SizedBox(height: 20),
            PlotRequestField(
              controller: _request,
              enabled: !_generating,
              label: 'どんな話を読みたいですか',
              hint: '例：港町を舞台にした、幼なじみ二人の謎解き',
              suggestions: firstChapterSuggestions,
            ),
            const SizedBox(height: 20),
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
                label: '第1章を書いてもらう',
                loading: _generating,
                onPressed: plotRequestError(value.text) == null
                    ? _generate
                    : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
