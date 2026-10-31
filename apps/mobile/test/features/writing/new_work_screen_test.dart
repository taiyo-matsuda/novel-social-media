import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tsuzuri/features/writing/new_work_screen.dart';
import 'package:tsuzuri/services/api_client.dart';

import 'fake_writing_api.dart';

void main() {
  late FakeWritingApi api;

  setUp(() => api = FakeWritingApi());

  Future<void> pump(WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(home: NewWorkScreen(api: api)));
    await tester.pumpAndSettle();
  }

  testWidgets('読みたい話を伝えて第1章を書いてもらうと、作品の画面に移る', (tester) async {
    await pump(tester);
    await tester.enterText(find.byType(TextField), '猫の話');
    await tester.tap(find.text('少し切ない話'));
    await tester.pump();
    expect(find.text('猫の話。少し切ない話'), findsOneWidget);

    await tester.tap(find.text('第1章を書いてもらう'));
    await tester.pumpAndSettle();

    expect(api.requests.single, (workId: null, plotRequest: '猫の話。少し切ない話'));
    expect(find.text('第1章　第1章の題'), findsOneWidget);
    expect(find.text('第1章の本文'), findsOneWidget);
  });

  testWidgets('AIに断られたら理由を出し、この画面に残る', (tester) async {
    api.failNext = ApiException(422, 'この内容では章を生成できませんでした');
    await pump(tester);
    await tester.tap(find.text('第1章を書いてもらう'));
    await tester.pumpAndSettle();

    expect(find.textContaining('この内容では章を生成できませんでした'), findsOneWidget);
    expect(find.text('第1章を書いてもらう'), findsOneWidget);
  });

  testWidgets('長すぎるリクエストでは書いてもらえない', (tester) async {
    await pump(tester);
    await tester.enterText(find.byType(TextField), 'あ' * 501);
    await tester.pump();
    expect(find.text('500文字以内にしてください（いま501文字）'), findsOneWidget);

    await tester.tap(find.text('第1章を書いてもらう'));
    await tester.pumpAndSettle();
    expect(api.requests, isEmpty);
  });
}
