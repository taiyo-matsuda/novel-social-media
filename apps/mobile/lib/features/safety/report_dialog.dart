import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import 'safety.dart';

/// 作品を通報するダイアログを出す。通報できたら true
Future<bool> showReportDialog(
  BuildContext context, {
  required ApiClient api,
  required String workId,
}) async {
  final reported = await showDialog<bool>(
    context: context,
    builder: (_) => _ReportDialog(api: api, workId: workId),
  );
  return reported ?? false;
}

class _ReportDialog extends StatefulWidget {
  const _ReportDialog({required this.api, required this.workId});

  final ApiClient api;
  final String workId;

  @override
  State<_ReportDialog> createState() => _ReportDialogState();
}

class _ReportDialogState extends State<_ReportDialog> {
  final _detail = TextEditingController();
  ReportReason? _reason;
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _detail.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final reason = _reason;
    if (reason == null) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await widget.api.reportWork(widget.workId, reason, detail: _detail.text);
      if (mounted) Navigator.of(context).pop(true);
    } catch (_) {
      if (mounted) {
        setState(() {
          _sending = false;
          _error = '通報を送れませんでした。もう一度お試しください。';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AlertDialog(
      title: const Text('この作品を通報する'),
      scrollable: true,
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('運営が内容を確認します。通報した作品は、あなたの一覧に表示されなくなります。'),
          const SizedBox(height: 8),
          RadioGroup<ReportReason>(
            groupValue: _reason,
            onChanged: (r) => setState(() => _reason = r),
            child: Column(
              children: [
                for (final reason in ReportReason.values)
                  RadioListTile<ReportReason>(
                    value: reason,
                    title: Text(reportReasonLabel(reason)),
                    contentPadding: EdgeInsets.zero,
                    dense: true,
                  ),
              ],
            ),
          ),
          TextField(
            controller: _detail,
            maxLength: maxReportDetailLength,
            maxLines: 3,
            minLines: 1,
            decoration: const InputDecoration(
              labelText: '詳しく（任意）',
              border: OutlineInputBorder(),
            ),
          ),
          if (_error != null)
            Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _sending ? null : () => Navigator.of(context).pop(false),
          child: const Text('やめる'),
        ),
        FilledButton(
          onPressed: _reason == null || _sending ? null : _send,
          child: const Text('通報する'),
        ),
      ],
    );
  }
}
