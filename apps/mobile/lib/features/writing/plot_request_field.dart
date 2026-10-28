import 'package:flutter/material.dart';

import 'plot_request.dart';

/// 展開リクエストの入力欄。下に例を並べ、押すと入力欄に付け足す
class PlotRequestField extends StatelessWidget {
  const PlotRequestField({
    super.key,
    required this.controller,
    required this.label,
    required this.hint,
    required this.suggestions,
    this.enabled = true,
  });

  final TextEditingController controller;
  final String label;
  final String hint;
  final List<String> suggestions;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder(
      valueListenable: controller,
      builder: (context, value, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextField(
            controller: controller,
            enabled: enabled,
            minLines: 2,
            maxLines: 5,
            decoration: InputDecoration(
              labelText: label,
              hintText: hint,
              border: const OutlineInputBorder(),
              errorText: plotRequestError(value.text),
              helperText: 'なくても書いてもらえます',
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: [
              for (final s in suggestions)
                ActionChip(
                  label: Text(s),
                  onPressed: enabled
                      ? () {
                          final text = appendSuggestion(controller.text, s);
                          controller.value = TextEditingValue(
                            text: text,
                            selection: TextSelection.collapsed(
                              offset: text.length,
                            ),
                          );
                        }
                      : null,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// AIが書いている間に出す表示
class GeneratingNotice extends StatelessWidget {
  const GeneratingNotice({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      color: theme.colorScheme.secondaryContainer,
      child: const Padding(
        padding: EdgeInsets.all(16),
        child: Row(
          children: [
            SizedBox.square(
              dimension: 22,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
            SizedBox(width: 16),
            Expanded(
              child: Text(
                'AIが書いています。1分ほどかかることがあります。この画面のままお待ちください。',
                style: TextStyle(fontSize: 15, height: 1.5),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
