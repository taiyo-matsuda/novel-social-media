import 'package:novel_sns/services/api_client.dart';

import '../writing/fake_writing_api.dart';

/// みんなの作品の画面のテスト用。サーバーを呼ばずにメモリ上で公開作品を持つ。
/// 「書く」タブも一緒に試せるよう、小説を書く画面の偽物を継承する
class FakeReadingApi extends FakeWritingApi {
  final works = <PublicWork>[];
  final reads = <(String, int, ReadKind)>[];
  final likes = <String, bool>{};

  /// 公開作品を1つ足す。章の本文は「第n章の本文（長さ [bodyLines] 行）」
  void addWork(
    String id, {
    String title = '古書店の少女',
    int chapters = 2,
    bool isMine = false,
    int likeCount = 0,
    int bodyLines = 1,
  }) {
    works.add(
      PublicWork(
        summary: PublicWorkSummary(
          id: id,
          title: title,
          authorName: '太郎',
          chapterCount: chapters,
          publishedAt: DateTime.utc(2026, 10, 28),
          readers: 0,
          likes: likeCount,
        ),
        isMine: isMine,
        likedByMe: false,
        chapters: [
          for (var n = 1; n <= chapters; n++)
            Chapter(
              position: n,
              title: '第$n章の題',
              body: List.filled(bodyLines, '第$n章の本文').join('\n'),
            ),
        ],
      ),
    );
  }

  @override
  Future<List<PublicWorkSummary>> fetchPublicWorks() async =>
      works.map((w) => w.summary).toList();

  @override
  Future<PublicWork> fetchPublicWork(String workId) async {
    for (final w in works) {
      if (w.summary.id == workId) return w;
    }
    throw ApiException(404, '作品が見つかりません');
  }

  @override
  Future<void> recordRead(String workId, int position, ReadKind kind) async {
    reads.add((workId, position, kind));
  }

  @override
  Future<int> setLike(String workId, {required bool liked}) async {
    likes[workId] = liked;
    return liked ? 1 : 0;
  }
}
