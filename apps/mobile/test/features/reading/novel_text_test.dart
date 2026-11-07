import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ballad/features/reading/novel_text.dart';

void main() {
  group('novelBlocks', () {
    test('段落の頭を一字下げ、会話の段落は下げない', () {
      expect(novelBlocks('雨が降っていた。\n「傘は」\n彼女は首を振った。'), const [
        NovelParagraph('　雨が降っていた。'),
        NovelParagraph('「傘は」'),
        NovelParagraph('　彼女は首を振った。'),
      ]);
    });

    test('「＊」の行は場面転換にする。続いたものや端のものはまとめる・捨てる', () {
      expect(novelBlocks('＊\n一つ目。\n＊\n＊\n二つ目。\n＊'), const [
        NovelParagraph('　一つ目。'),
        NovelSceneBreak(),
        NovelParagraph('　二つ目。'),
      ]);
    });

    test('空行と、もともとの字下げは捨てて組み直す', () {
      expect(novelBlocks('　一つ目。\n\n　　二つ目。\n'), const [
        NovelParagraph('　一つ目。'),
        NovelParagraph('　二つ目。'),
      ]);
    });
  });

  testWidgets('本文を段落ごとに表示する', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: NovelText('一つ目。\n＊\n「二つ目」'))),
    );
    expect(find.text('　一つ目。'), findsOneWidget);
    expect(find.text('＊'), findsOneWidget);
    expect(find.text('「二つ目」'), findsOneWidget);
  });
}
