import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novel_sns/features/writing/work_screen.dart';

import 'fake_writing_api.dart';

/// 画面の下にあってまだ作られていないボタンまで、本文の一覧をスクロールする
Future<void> scrollTo(WidgetTester tester, Finder finder) => tester
    .scrollUntilVisible(finder, 200, scrollable: find.byType(Scrollable).first);

void main() {
  late FakeWritingApi api;
  late String workId;

  setUp(() async {
    api = FakeWritingApi();
    workId = (await api.generateChapter(plotRequest: '猫の話')).workId;
    api.requests.clear();
  });

  Future<void> pump(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: WorkScreen(api: api, workId: workId),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('章とそのときのリクエストを読める', (tester) async {
    await pump(tester);
    expect(find.text('第1章　第1章の題'), findsOneWidget);
    expect(find.text('あなたのリクエスト：猫の話'), findsOneWidget);
    expect(find.text('下書き・1章'), findsOneWidget);
  });

  testWidgets('次はこうしてほしいと伝えて続きを書いてもらえる', (tester) async {
    await pump(tester);
    await tester.tap(find.text('謎を一つ明かして'));
    await tester.pump();
    await scrollTo(tester, find.text('第2章を書いてもらう'));
    await tester.tap(find.text('第2章を書いてもらう'));
    await tester.pumpAndSettle();

    expect(api.requests.single, (workId: workId, plotRequest: '謎を一つ明かして'));
    expect(find.text('第2章　第2章の題'), findsOneWidget);
    expect(find.text('第3章を書いてもらう'), findsOneWidget);
    // 送ったリクエストは入力欄から消える
    expect(find.widgetWithText(TextField, '謎を一つ明かして'), findsNothing);
  });

  testWidgets('確認してから公開し、非公開に戻せる', (tester) async {
    await pump(tester);
    await scrollTo(tester, find.text('この作品を公開する'));
    await tester.tap(find.text('この作品を公開する'));
    await tester.pumpAndSettle();
    expect(find.text('この作品を公開しますか'), findsOneWidget);
    await tester.tap(find.text('公開する'));
    await tester.pumpAndSettle();

    expect(api.published[workId], isTrue);
    expect(find.text('非公開にする'), findsOneWidget);

    await tester.tap(find.text('非公開にする'));
    await tester.pumpAndSettle();
    expect(api.published[workId], isFalse);
  });

  testWidgets('題名を変えられる', (tester) async {
    await pump(tester);
    await tester.tap(find.byTooltip('題名を変える'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.byType(TextField),
      ),
      ' 古書店の少女 ',
    );
    await tester.pump();
    await tester.tap(find.text('保存'));
    await tester.pumpAndSettle();

    expect(api.titles[workId], '古書店の少女');
    expect(find.widgetWithText(AppBar, '古書店の少女'), findsOneWidget);
  });
}
