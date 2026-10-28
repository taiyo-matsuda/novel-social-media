import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novel_sns/features/reading/reading_screen.dart';
import 'package:novel_sns/services/api_client.dart';

import 'fake_reading_api.dart';

void main() {
  late FakeReadingApi api;

  setUp(() => api = FakeReadingApi());

  Future<void> pump(WidgetTester tester, String workId) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ReadingScreen(api: api, workId: workId),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('1章ずつ読め、読み始め・読み終えたを記録する', (tester) async {
    api.addWork('w1');
    await pump(tester, 'w1');

    expect(find.text('第1章の本文'), findsOneWidget);
    // 短い章は表示しただけで読み終えた扱い
    expect(api.reads, [
      ('w1', 1, ReadKind.start),
      ('w1', 1, ReadKind.complete),
    ]);

    await tester.tap(find.text('第2章へ'));
    await tester.pumpAndSettle();
    expect(find.text('第2章の本文'), findsOneWidget);
    expect(api.reads.skip(2), [
      ('w1', 2, ReadKind.start),
      ('w1', 2, ReadKind.complete),
    ]);

    // 前の章に戻っても同じ記録は送らない
    await tester.tap(find.text('前の章へ'));
    await tester.pumpAndSettle();
    expect(api.reads, hasLength(4));
  });

  testWidgets('長い章は終わりまで送ったときに読み終えたを記録する', (tester) async {
    api.addWork('w1', chapters: 1, bodyLines: 200);
    await pump(tester, 'w1');
    expect(api.reads, [('w1', 1, ReadKind.start)]);

    await tester.fling(find.byType(ListView), const Offset(0, -20000), 5000);
    await tester.pumpAndSettle();
    expect(api.reads.last, ('w1', 1, ReadKind.complete));
  });

  testWidgets('最後の章で高評価を付け外しできる', (tester) async {
    api.addWork('w1', chapters: 1);
    await pump(tester, 'w1');

    await tester.tap(find.text('高評価を付ける'));
    await tester.pumpAndSettle();
    expect(api.likes['w1'], isTrue);
    expect(find.text('高評価を付けました'), findsOneWidget);
    expect(find.byIcon(Icons.favorite), findsOneWidget);

    await tester.tap(find.byIcon(Icons.favorite));
    await tester.pumpAndSettle();
    expect(api.likes['w1'], isFalse);
  });

  testWidgets('自分の作品には高評価がなく、読んだ記録も送らない', (tester) async {
    api.addWork('w1', chapters: 1, isMine: true);
    await pump(tester, 'w1');
    expect(find.textContaining('あなたの作品'), findsOneWidget);
    expect(find.byIcon(Icons.favorite_border), findsNothing);
    expect(find.text('高評価を付ける'), findsNothing);
    expect(api.reads, isEmpty);
  });

  testWidgets('非公開になった作品は理由を出す', (tester) async {
    await pump(tester, 'missing');
    expect(find.text('この作品は非公開になったか、削除されました。'), findsOneWidget);
  });
}
