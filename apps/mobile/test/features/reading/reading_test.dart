import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novel_sns/features/reading/reading.dart';
import 'package:novel_sns/services/api_client.dart';

PublicWorkSummary summary({int readers = 0, int likes = 0}) =>
    PublicWorkSummary(
      id: 'w1',
      authorId: 'u2',
      title: '古書店の少女',
      authorName: '太郎',
      chapterCount: 3,
      publishedAt: DateTime.utc(2026, 10, 28),
      readers: readers,
      likes: likes,
    );

ScrollMetrics metrics(double pixels, double max) => FixedScrollMetrics(
  minScrollExtent: 0,
  maxScrollExtent: max,
  pixels: pixels,
  viewportDimension: 600,
  axisDirection: AxisDirection.down,
  devicePixelRatio: 2,
);

void main() {
  group('publicWorkLabel', () {
    test('まだ反応がなければ作者と章の数だけ', () {
      expect(publicWorkLabel(summary()), '太郎・3章');
    });

    test('読んだ人数と高評価があれば付け足す', () {
      expect(
        publicWorkLabel(summary(readers: 4, likes: 2)),
        '太郎・3章・4人が読んだ・高評価 2',
      );
    });
  });

  group('reachedChapterEnd', () {
    test('下端の近くまで送ったら読み終えた扱い', () {
      expect(reachedChapterEnd(metrics(0, 1000)), isFalse);
      expect(reachedChapterEnd(metrics(960, 1000)), isTrue);
    });

    test('画面に収まる短い章は表示しただけで読み終えた扱い', () {
      expect(reachedChapterEnd(metrics(0, 0)), isTrue);
    });
  });

  group('readProgress', () {
    test('画面の下端が章のどこまで来たかを返す', () {
      expect(readProgress(metrics(0, 1400)), 0.3);
      expect(readProgress(metrics(700, 1400)), closeTo(0.65, 1e-9));
      expect(readProgress(metrics(1400, 1400)), 1);
    });

    test('画面に収まる短い章と、行き過ぎたスクロールは 1', () {
      expect(readProgress(metrics(0, 0)), 1);
      expect(readProgress(metrics(1500, 1400)), 1);
    });
  });

  test('ReadTracker は同じ章・同じ種類を一度だけ通す', () {
    final tracker = ReadTracker();
    expect(tracker.mark(1, ReadKind.start), isTrue);
    expect(tracker.mark(1, ReadKind.start), isFalse);
    expect(tracker.mark(1, ReadKind.complete), isTrue);
    expect(tracker.mark(2, ReadKind.start), isTrue);
  });

  test('ReadTracker は離脱を何度でも通し、読み始め・読み終えを覚える', () {
    final tracker = ReadTracker();
    expect(tracker.started(1), isFalse);
    tracker.mark(1, ReadKind.start);
    expect(tracker.started(1), isTrue);
    expect(tracker.completed(1), isFalse);
    expect(tracker.mark(1, ReadKind.leave), isTrue);
    expect(tracker.mark(1, ReadKind.leave), isTrue);
    tracker.mark(1, ReadKind.complete);
    expect(tracker.completed(1), isTrue);
  });
}
