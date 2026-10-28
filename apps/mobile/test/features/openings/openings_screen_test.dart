import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tsuzuri/features/openings/deck.dart';
import 'package:tsuzuri/features/openings/openings_screen.dart';
import 'package:tsuzuri/services/api_client.dart';
import 'package:tsuzuri/services/token_store.dart';

class FakeApi extends ApiClient {
  FakeApi() : super(baseUrl: 'http://api.test', tokens: MemoryTokenStore());

  final saved = <int, bool>{};
  bool failSave = false;

  @override
  Future<List<Opening>> fetchOpenings() async => const [
    Opening(id: 1, text: '雨の夜だった。', genre: 'ミステリー'),
    Opening(id: 2, text: '春が来た。'),
    Opening(id: 3, text: '剣を抜いた。', genre: 'ファンタジー'),
  ];

  @override
  Future<Map<int, bool>> fetchOwnChoices() async => {};

  @override
  Future<void> saveChoice(int openingId, bool wantsToRead) async {
    if (failSave) throw ApiException(500, 'x');
    saved[openingId] = wantsToRead;
  }
}

void main() {
  late FakeApi api;
  late int finished;

  Future<void> pump(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: OpeningsScreen(api: api, onFinish: () async => finished++),
      ),
    );
    await tester.pumpAndSettle();
  }

  setUp(() {
    api = FakeApi();
    finished = 0;
  });

  testWidgets('冒頭文を1つずつ選び、3つ選ぶと始められる', (tester) async {
    await pump(tester);
    expect(find.text('雨の夜だった。'), findsOneWidget);
    expect(find.text('この好みで始める'), findsNothing);

    await tester.tap(find.text('読みたい'));
    await tester.pumpAndSettle();
    expect(find.text('春が来た。'), findsOneWidget);

    await tester.tap(find.text('読みたくない'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('読みたい'));
    await tester.pumpAndSettle();

    expect(api.saved, {1: true, 2: false, 3: true});
    expect(find.text('すべての書き出しを選び終えました。'), findsOneWidget);
    await tester.tap(find.text('この好みで始める'));
    await tester.pumpAndSettle();
    expect(finished, 1);
  });

  testWidgets('保存に失敗したら同じ冒頭文に戻してエラーを出す', (tester) async {
    api.failSave = true;
    await pump(tester);
    await tester.tap(find.text('読みたい'));
    await tester.pumpAndSettle();
    expect(find.text('雨の夜だった。'), findsOneWidget);
    expect(find.text('保存できませんでした。もう一度選んでください。'), findsOneWidget);
  });
}
