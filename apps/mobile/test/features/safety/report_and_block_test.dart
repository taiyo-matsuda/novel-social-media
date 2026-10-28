import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tsuzuri/features/reading/public_works_screen.dart';
import 'package:tsuzuri/services/api_client.dart';

import '../reading/fake_reading_api.dart';

void main() {
  late FakeReadingApi api;

  setUp(() => api = FakeReadingApi());

  /// ランキングから作品を開き、右上のメニューを出す
  Future<void> openMenu(WidgetTester tester, String title) async {
    await tester.pumpWidget(MaterialApp(home: PublicWorksScreen(api: api)));
    await tester.pumpAndSettle();
    await tester.tap(find.text(title));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('その他'));
    await tester.pumpAndSettle();
  }

  testWidgets('理由を選んで通報すると、一覧に戻り作品が消える', (tester) async {
    api
      ..addWork('w1', title: '通報する作品')
      ..addWork('w2', title: 'ほかの作品', authorId: 'u-hanako');
    await openMenu(tester, '通報する作品');
    await tester.tap(find.text('この作品を通報する'));
    await tester.pumpAndSettle();

    // 理由を選ぶまで送れない
    final send = find.widgetWithText(FilledButton, '通報する');
    expect(tester.widget<FilledButton>(send).onPressed, isNull);

    await tester.tap(find.text('スパム・宣伝'));
    await tester.enterText(find.byType(TextField), '宣伝ばかり');
    await tester.pumpAndSettle();
    await tester.tap(send);
    await tester.pumpAndSettle();

    expect(api.reports, [('w1', ReportReason.spam, '宣伝ばかり')]);
    expect(find.text('通報しました。運営が内容を確認します。'), findsOneWidget);
    expect(find.text('通報する作品'), findsNothing);
    expect(find.text('ほかの作品'), findsOneWidget);
  });

  testWidgets('通報をやめれば何も送らない', (tester) async {
    api.addWork('w1', title: '通報する作品');
    await openMenu(tester, '通報する作品');
    await tester.tap(find.text('この作品を通報する'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('やめる'));
    await tester.pumpAndSettle();

    expect(api.reports, isEmpty);
    expect(find.text('第1章の本文'), findsOneWidget);
  });

  testWidgets('作者をブロックすると、確かめたうえでその人の作品が一覧から消える', (tester) async {
    api
      ..addWork('w1', title: '太郎の作品1')
      ..addWork('w2', title: '太郎の作品2')
      ..addWork('w3', title: '花子の作品', authorId: 'u-hanako', authorName: '花子');
    await openMenu(tester, '太郎の作品1');
    await tester.tap(find.text('太郎さんをブロックする'));
    await tester.pumpAndSettle();
    expect(find.text('太郎さんをブロックしますか？'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'ブロックする'));
    await tester.pumpAndSettle();

    expect(api.blocked, {'u-taro'});
    expect(find.text('太郎さんをブロックしました。'), findsOneWidget);
    expect(find.textContaining('太郎の作品'), findsNothing);
    expect(find.text('花子の作品'), findsOneWidget);
  });

  testWidgets('自分の作品には通報・ブロックのメニューを出さない', (tester) async {
    api.addWork('w1', title: '自分の作品', isMine: true);
    await tester.pumpWidget(MaterialApp(home: PublicWorksScreen(api: api)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('自分の作品'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('その他'), findsNothing);
  });
}
