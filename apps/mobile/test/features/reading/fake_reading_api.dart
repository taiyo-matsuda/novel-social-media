import 'package:tsuzuri/services/api_client.dart';

import '../writing/fake_writing_api.dart';

/// みんなの作品の画面のテスト用。サーバーを呼ばずにメモリ上で公開作品を持つ。
/// 「書く」タブも一緒に試せるよう、小説を書く画面の偽物を継承する
class FakeReadingApi extends FakeWritingApi {
  final works = <PublicWork>[];
  final reads = <(String, int, ReadKind)>[];

  /// 離れたときに送られた読了率（作品ID・章・読了率）
  final leaves = <(String, int, double)>[];
  final likes = <String, bool>{};

  /// 通報（作品ID・理由・補足）
  final reports = <(String, ReportReason, String?)>[];

  /// ブロックした作者の利用者ID
  final blocked = <String>{};

  /// 公開作品を1つ足す。章の本文は「第n章の本文（長さ [bodyLines] 行）」
  void addWork(
    String id, {
    String title = '古書店の少女',
    int chapters = 2,
    bool isMine = false,
    int likeCount = 0,
    int bodyLines = 1,
    String authorId = 'u-taro',
    String authorName = '太郎',
  }) {
    works.add(
      PublicWork(
        summary: PublicWorkSummary(
          id: id,
          title: title,
          authorId: authorId,
          authorName: authorName,
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
  Future<List<PublicWorkSummary>> fetchPublicWorks() async => [
    for (final w in works)
      if (!blocked.contains(w.summary.authorId) &&
          !reports.any((r) => r.$1 == w.summary.id))
        w.summary,
  ];

  @override
  Future<PublicWork> fetchPublicWork(String workId) async {
    for (final w in works) {
      if (w.summary.id == workId) return w;
    }
    throw ApiException(404, '作品が見つかりません');
  }

  @override
  Future<void> recordRead(
    String workId,
    int position,
    ReadKind kind, {
    double? progress,
  }) async {
    reads.add((workId, position, kind));
    if (progress != null) leaves.add((workId, position, progress));
  }

  @override
  Future<int> setLike(String workId, {required bool liked}) async {
    likes[workId] = liked;
    return liked ? 1 : 0;
  }

  @override
  Future<void> reportWork(
    String workId,
    ReportReason reason, {
    String? detail,
  }) async => reports.add((workId, reason, detail));

  @override
  Future<void> block(String userId) async => blocked.add(userId);

  @override
  Future<void> unblock(String userId) async => blocked.remove(userId);

  @override
  Future<List<BlockedUser>> fetchBlocks() async => [
    for (final id in blocked)
      BlockedUser(
        userId: id,
        name: works
            .firstWhere((w) => w.summary.authorId == id)
            .summary
            .authorName,
        blockedAt: DateTime.utc(2026, 10, 28),
      ),
  ];
}
