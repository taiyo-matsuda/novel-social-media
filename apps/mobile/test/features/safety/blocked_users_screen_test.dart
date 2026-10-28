import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novel_sns/features/safety/blocked_users_screen.dart';

import '../reading/fake_reading_api.dart';

void main() {
  late FakeReadingApi api;

  setUp(() => api = FakeReadingApi());

  Future<void> pump(WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(home: BlockedUsersScreen(api: api)));
    await tester.pumpAndSettle();
  }

  testWidgets('ブロックしている人がいなければ案内を出す', (tester) async {
    await pump(tester);
    expect(find.textContaining('ブロックしている人はいません'), findsOneWidget);
  });

  testWidgets('ブロックした人が並び、解除すると一覧から消える', (tester) async {
    api
      ..addWork('w1')
      ..addWork('w2', authorId: 'u-hanako', authorName: '花子')
      ..blocked.addAll({'u-taro', 'u-hanako'});
    await pump(tester);
    expect(find.text('太郎'), findsOneWidget);
    expect(find.text('花子'), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.widgetWithText(ListTile, '太郎'),
        matching: find.text('解除'),
      ),
    );
    await tester.pumpAndSettle();

    expect(api.blocked, {'u-hanako'});
    expect(find.text('太郎'), findsNothing);
    expect(find.text('花子'), findsOneWidget);
  });
}
