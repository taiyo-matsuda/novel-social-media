import 'package:ballad/features/writing/moderation_notice.dart';
import 'package:ballad/services/api_client.dart';
import 'package:flutter_test/flutter_test.dart';

WorkSummary _work(WorkModeration moderation) => WorkSummary(
  id: 'w1',
  title: '古書店',
  published: true,
  chapterCount: 1,
  publishedAt: DateTime.utc(2026, 10, 28),
  updatedAt: DateTime.utc(2026, 10, 28),
  moderation: moderation,
);

void main() {
  test('問題なしの作品には知らせを出さない', () {
    expect(moderationNotice(_work(WorkModeration.ok)), isNull);
  });

  test('仮で隠している作品には、確認中で元に戻ることもあると伝える', () {
    final notice = moderationNotice(_work(WorkModeration.hidden))!;
    expect(notice, contains('運営が確認するまで'));
    expect(notice, contains('元に戻します'));
  });

  test('取り下げた作品には、責めずに規約に基づくことだけ伝える', () {
    final notice = moderationNotice(_work(WorkModeration.removed))!;
    expect(notice, contains('利用規約に基づき'));
    expect(notice, isNot(contains('盗作')));
  });
}
