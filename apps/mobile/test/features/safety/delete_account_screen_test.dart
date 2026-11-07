import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ballad/features/auth/auth_controller.dart';
import 'package:ballad/features/safety/delete_account_screen.dart';
import 'package:ballad/widgets/app_button.dart';

import '../auth/auth_controller_test.dart' show FakeApi, FakeGoogle;

void main() {
  late FakeApi api;
  late AuthController auth;

  setUp(() async {
    api = FakeApi();
    auth = AuthController(api, FakeGoogle());
    await auth.signInWithGoogle();
    // ログインしてから時間がたった状態（退会の前に Google でログインし直す）
    api.freshSession = false;
  });

  /// ホームから退会の画面を開いた状態にする
  Future<void> pump(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => DeleteAccountScreen(auth: auth),
                ),
              ),
              child: const Text('ホーム'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('ホーム'));
    await tester.pumpAndSettle();
  }

  testWidgets('パスワード欄はなく、Google で確かめて退会すると最初の画面に戻る', (tester) async {
    await pump(tester);
    expect(find.byType(TextField), findsNothing);
    expect(find.textContaining('Google のログイン画面が開きます'), findsOneWidget);

    await tester.tap(find.widgetWithText(AppButton, '退会する'));
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(FilledButton, '退会する'),
      ),
    );
    await tester.pumpAndSettle();
    expect(auth.user, isNull);
    expect(api.deleted, isTrue);
    expect(find.text('ホーム'), findsOneWidget);
    expect(find.byType(DeleteAccountScreen), findsNothing);
  });

  testWidgets('確認でやめたら何もしない', (tester) async {
    await pump(tester);
    await tester.tap(find.widgetWithText(AppButton, '退会する'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('やめる'));
    await tester.pumpAndSettle();
    expect(auth.user, isNotNull);
    expect(api.deleted, isFalse);
  });
}
