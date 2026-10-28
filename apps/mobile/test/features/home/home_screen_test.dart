import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tsuzuri/features/auth/auth_controller.dart';

import '../auth/auth_controller_test.dart' show FakeGoogle;

import 'package:tsuzuri/features/home/home_screen.dart';

import '../writing/fake_writing_api.dart';

void main() {
  late FakeWritingApi api;

  setUp(() => api = FakeWritingApi());

  Future<void> pump(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: HomeScreen(
          api: api,
          auth: AuthController(api, FakeGoogle()),
          onChooseAgain: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('作品がないときは案内を出す', (tester) async {
    await pump(tester);
    expect(find.textContaining('まだ作品はありません'), findsOneWidget);
  });

  testWidgets('新しい小説を書いてもらって戻ると、一覧に並ぶ', (tester) async {
    await pump(tester);
    await tester.tap(find.text('新しい小説を書いてもらう'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('第1章を書いてもらう'));
    await tester.pumpAndSettle();
    expect(find.text('第1章の本文'), findsOneWidget);

    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(find.text('第1章の題'), findsOneWidget);
    expect(find.text('下書き・1章'), findsOneWidget);
  });
}
