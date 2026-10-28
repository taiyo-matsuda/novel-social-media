import 'package:flutter_test/flutter_test.dart';
import 'package:novel_sns/features/writing/plot_request.dart';
import 'package:novel_sns/services/api_client.dart';

void main() {
  group('appendSuggestion', () {
    test('空ならそのまま入れる', () {
      expect(appendSuggestion('', '少し切ない話'), '少し切ない話');
      expect(appendSuggestion('  ', '少し切ない話'), '少し切ない話');
    });

    test('文の後ろには「。」で区切って足す', () {
      expect(appendSuggestion('猫の話', '少し切ない話'), '猫の話。少し切ない話');
      expect(appendSuggestion('猫の話。', '少し切ない話'), '猫の話。少し切ない話');
    });

    test('同じ例は二度足さない', () {
      expect(appendSuggestion('猫の話。少し切ない話', '少し切ない話'), '猫の話。少し切ない話');
    });
  });

  test('plotRequestError は500文字を超えたときだけエラーを返す', () {
    expect(plotRequestError('あ' * 500), isNull);
    expect(plotRequestError('あ' * 501), '500文字以内にしてください（いま501文字）');
  });

  group('generationErrorMessage', () {
    test('AIに断られたときはサーバーの説明を出す', () {
      expect(
        generationErrorMessage(ApiException(422, 'この内容では章を生成できませんでした')),
        contains('この内容では章を生成できませんでした'),
      );
    });

    test('通信できないときとサーバーの失敗を分ける', () {
      expect(
        generationErrorMessage(Exception('offline')),
        contains('通信できませんでした'),
      );
      expect(
        generationErrorMessage(ApiException(500, 'x')),
        contains('時間をおいて'),
      );
    });
  });

  test('workStatusLabel は公開状態と章の数を出す', () {
    final work = WorkSummary(
      id: 'w1',
      title: '古書店',
      published: true,
      chapterCount: 3,
      publishedAt: DateTime.utc(2026, 10, 28),
      updatedAt: DateTime.utc(2026, 10, 28),
    );
    expect(workStatusLabel(work), '公開中・3章');
  });
}
