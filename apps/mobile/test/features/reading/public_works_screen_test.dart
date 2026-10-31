import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tsuzuri/features/reading/public_works_screen.dart';

import 'fake_reading_api.dart';

void main() {
  late FakeReadingApi api;

  setUp(() => api = FakeReadingApi());

  Future<void> pump(WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(home: PublicWorksScreen(api: api)));
    await tester.pumpAndSettle();
  }

  testWidgets('公開作品がないときは案内を出す', (tester) async {
    await pump(tester);
    expect(find.textContaining('まだ公開された作品はありません'), findsOneWidget);
  });

  testWidgets('ランキング順に順位付きで並び、押すと読む画面が開く', (tester) async {
    api
      ..addWork('w1', title: '一位の作品', likeCount: 2)
      ..addWork('w2', title: '二位の作品');
    await pump(tester);

    expect(find.text('1'), findsOneWidget);
    expect(find.text('一位の作品'), findsOneWidget);
    expect(find.text('太郎・2章・高評価 2'), findsOneWidget);

    await tester.tap(find.text('二位の作品'));
    await tester.pumpAndSettle();
    expect(find.text('第1章　第1章の題'), findsOneWidget);
  });
}
