import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novel_sns/features/auth/auth_controller.dart';
import 'package:novel_sns/features/home/main_shell.dart';

import '../reading/fake_reading_api.dart';

void main() {
  testWidgets('最初は「みんなの作品」を見せ、「書く」タブで自分の作品に切り替える', (tester) async {
    final api = FakeReadingApi()..addWork('w1', title: 'みんなの一作');
    await tester.pumpWidget(
      MaterialApp(
        home: MainShell(
          api: api,
          auth: AuthController(api),
          onChooseAgain: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('みんなの一作'), findsOneWidget);

    await tester.tap(find.text('書く'));
    await tester.pumpAndSettle();
    expect(find.text('新しい小説を書いてもらう'), findsOneWidget);
  });
}
