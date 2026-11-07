import 'package:flutter/material.dart';

/// 本文を組むときのひとかたまり。段落か、場面転換
sealed class NovelBlock {
  const NovelBlock();
}

class NovelParagraph extends NovelBlock {
  const NovelParagraph(this.text);

  /// 字下げ済みの段落の文
  final String text;

  @override
  bool operator ==(Object other) =>
      other is NovelParagraph && other.text == text;

  @override
  int get hashCode => text.hashCode;

  @override
  String toString() => 'NovelParagraph($text)';
}

class NovelSceneBreak extends NovelBlock {
  const NovelSceneBreak();

  @override
  bool operator ==(Object other) => other is NovelSceneBreak;

  @override
  int get hashCode => 0;

  @override
  String toString() => 'NovelSceneBreak()';
}

/// 場面転換とみなす行（サーバーは「＊」で書かせる。古い作品の記号も受け付ける）
const _sceneBreaks = {'＊', '*', '※', '◇', '◆', '* * *', '＊＊＊', '***'};

/// 字下げしない段落の書き出し（会話や引用は本でも下げずに始める）
const _noIndentStarts = ['「', '『', '（', '(', '〈', '《', '―', '…'];

/// 本文を段落と場面転換に分け、段落の頭を一字下げる。
/// 1行を1段落とし、空行や行頭の空白は捨てる（古い作品の空行区切りもそのまま読めるように）
List<NovelBlock> novelBlocks(String body) {
  final blocks = <NovelBlock>[];
  for (final raw in body.split('\n')) {
    final line = raw.replaceFirst(RegExp(r'^[\s　]+'), '').trimRight();
    if (line.isEmpty) continue;
    if (_sceneBreaks.contains(line)) {
      // 続けて書かれた転換や、冒頭の転換は1つにまとめる・捨てる
      if (blocks.isNotEmpty && blocks.last is! NovelSceneBreak) {
        blocks.add(const NovelSceneBreak());
      }
      continue;
    }
    final indent = _noIndentStarts.any(line.startsWith) ? '' : '　';
    blocks.add(NovelParagraph('$indent$line'));
  }
  if (blocks.isNotEmpty && blocks.last is NovelSceneBreak) blocks.removeLast();
  return blocks;
}

/// 本文の文字の組み方。明朝体・行間広め。自分の作品の画面と公開作品の画面で同じにする
const novelBodyStyle = TextStyle(
  fontSize: 17,
  height: 1.9,
  letterSpacing: 0.3,
  fontFamily: 'Hiragino Mincho ProN',
  fontFamilyFallback: ['YuMincho', 'Noto Serif JP', 'serif'],
);

/// 本文の幅の上限。タブレットや横向きでも1行が長くなりすぎないようにする（17px でおよそ34字）
const novelMaxWidth = 600.0;

/// 本文の画面の余白。幅が [novelMaxWidth] を超える画面では左右を広げて、本文を中央に置く
EdgeInsets novelPagePadding(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width;
  final side = width > novelMaxWidth + 48 ? (width - novelMaxWidth) / 2 : 24.0;
  return EdgeInsets.fromLTRB(side, 24, side, 48);
}

/// 小説の本文を本のように組んで表示する。選択してコピーもできる
class NovelText extends StatelessWidget {
  const NovelText(this.body, {super.key});

  final String body;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.onSurfaceVariant;
    return SelectionArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final block in novelBlocks(body))
            switch (block) {
              NovelParagraph(:final text) => Text(text, style: novelBodyStyle),
              NovelSceneBreak() => Padding(
                padding: const EdgeInsets.symmetric(vertical: 20),
                child: Text(
                  '＊',
                  textAlign: TextAlign.center,
                  style: novelBodyStyle.copyWith(color: color, fontSize: 14),
                ),
              ),
            },
        ],
      ),
    );
  }
}

/// 章の頭。「第N章」を小さく、題を大きく、どちらも中央に置く
class ChapterHeading extends StatelessWidget {
  const ChapterHeading({
    super.key,
    required this.position,
    required this.title,
  });

  final int position;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 32),
      child: Column(
        children: [
          Text(
            '第$position章',
            textAlign: TextAlign.center,
            style: novelBodyStyle.copyWith(
              fontSize: 14,
              letterSpacing: 2,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            style: novelBodyStyle.copyWith(
              fontSize: 22,
              height: 1.5,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
