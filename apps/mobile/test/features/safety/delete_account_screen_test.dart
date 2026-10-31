import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tsuzuri/features/auth/auth_controller.dart';
import 'package:tsuzuri/features/safety/delete_account_screen.dart';
import 'package:tsuzuri/widgets/app_button.dart';

import '../auth/auth_controller_test.dart' show FakeApi, FakeGoogle;

void main() {
  late FakeApi api;
  late AuthController auth;
  var usePassword = true;

  setUp(() async {
    usePassword = true;
    api = FakeApi();
    auth = AuthController(api, FakeGoogle());
    await auth.submit(AuthMode.signIn, 'taro@example.com', 'password123');
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
                  builder: (_) => DeleteAccountScreen(
                    auth: auth,
                    hasPassword: () async => usePassword,
                  ),
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

  Future<void> submit(WidgetTester tester, String password) async {
    await tester.enterText(find.byType(TextField), password);
    await tester.pump();
    await tester.tap(find.widgetWithText(AppButton, '退会する'));
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.widgetWithText(FilledButton, '退会する'),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('パスワードを入れるまで押せない', (tester) async {
    await pump(tester);
    final button = tester.widget<AppButton>(
      find.widgetWithText(AppButton, '退会する'),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('パスワードが違えば理由を出し、ログインしたまま', (tester) async {
    await pump(tester);
    await submit(tester, 'wrong-password');
    expect(find.text('パスワードが違います。'), findsOneWidget);
    expect(auth.user, isNotNull);
  });

  testWidgets('確かめて退会すると、ログアウトして最初の画面に戻る', (tester) async {
    await pump(tester);
    await submit(tester, 'password123');
    expect(auth.user, isNull);
    expect(find.text('ホーム'), findsOneWidget);
    expect(find.byType(DeleteAccountScreen), findsNothing);
  });

  testWidgets('Google の人はパスワード欄の代わりに案内を出し、Google で確かめて退会する', (tester) async {
    usePassword = false;
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
    expect(find.byType(DeleteAccountScreen), findsNothing);
  });
}
