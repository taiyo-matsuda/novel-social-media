import 'package:flutter_test/flutter_test.dart';
import 'package:novel_sns/features/openings/deck.dart';

const openings = [
  Opening(id: 1, text: 'a', genre: 'ミステリー'),
  Opening(id: 2, text: 'b'),
  Opening(id: 3, text: 'c'),
  Opening(id: 4, text: 'd'),
];

void main() {
  group('nextOpening', () {
    test('答えていない最初の冒頭文を返す', () {
      expect(nextOpening(openings, {1: true, 3: false})?.id, 2);
    });

    test('全部答えたら null', () {
      expect(
        nextOpening(openings, {1: true, 2: true, 3: true, 4: false}),
        isNull,
      );
    });
  });

  group('canFinish', () {
    test('3つ以上答え、読みたいが1つ以上あれば始められる', () {
      expect(canFinish({1: true, 2: false, 3: false}), isTrue);
    });

    test('答えが3つ未満なら始められない', () {
      expect(canFinish({1: true, 2: true}), isFalse);
    });

    test('全部読みたくないなら始められない', () {
      expect(canFinish({1: false, 2: false, 3: false}), isFalse);
    });
  });

  test('likedCount は読みたいの数', () {
    expect(likedCount({1: true, 2: false, 3: true}), 2);
  });

  group('isStuck', () {
    test('全部読みたくないで使い切ると行き止まり', () {
      expect(
        isStuck(openings, {1: false, 2: false, 3: false, 4: false}),
        isTrue,
      );
    });

    test('まだ選べるものがあれば行き止まりではない', () {
      expect(isStuck(openings, {1: false}), isFalse);
    });

    test('始められるなら行き止まりではない', () {
      expect(
        isStuck(openings, {1: true, 2: false, 3: false, 4: false}),
        isFalse,
      );
    });
  });

  test('サーバーの JSON から読み込める', () {
    final o = Opening.fromJson({'id': 5, 'text': '雨の夜', 'genre': null});
    expect(o.id, 5);
    expect(o.genre, isNull);
  });
}
