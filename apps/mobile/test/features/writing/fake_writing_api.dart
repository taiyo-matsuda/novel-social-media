import 'package:tsuzuri/services/api_client.dart';
import 'package:tsuzuri/services/token_store.dart';

/// 小説を書く画面のテスト用。サーバーを呼ばずにメモリ上で作品を持つ
class FakeWritingApi extends ApiClient {
  FakeWritingApi()
    : super(baseUrl: 'http://api.test', tokens: MemoryTokenStore());

  final chapters = <String, List<Chapter>>{};
  final titles = <String, String>{};
  final published = <String, bool>{};
  final requests = <({String? workId, String? plotRequest})>[];

  /// 次の生成で投げるエラー
  Object? failNext;

  @override
  Future<GeneratedChapter> generateChapter({
    String? workId,
    String? plotRequest,
  }) async {
    requests.add((workId: workId, plotRequest: plotRequest));
    final error = failNext;
    if (error != null) {
      failNext = null;
      throw error;
    }
    final id = workId ?? 'work-${chapters.length + 1}';
    final list = chapters.putIfAbsent(id, () => []);
    final n = list.length + 1;
    titles.putIfAbsent(id, () => '第1章の題');
    final chapter = Chapter(
      position: n,
      title: '第$n章の題',
      body: '第$n章の本文',
      plotRequest: plotRequest?.trim().isEmpty ?? true ? null : plotRequest,
    );
    list.add(chapter);
    return GeneratedChapter(workId: id, chapter: chapter);
  }

  WorkSummary _summary(String id) => WorkSummary(
    id: id,
    title: titles[id]!,
    published: published[id] ?? false,
    chapterCount: chapters[id]!.length,
    publishedAt: null,
    updatedAt: DateTime.utc(2026, 10, 28),
  );

  @override
  Future<List<WorkSummary>> fetchOwnWorks() async =>
      chapters.keys.map(_summary).toList();

  @override
  Future<Work> fetchOwnWork(String workId) async {
    if (!chapters.containsKey(workId)) throw ApiException(404, '作品が見つかりません');
    return Work(summary: _summary(workId), chapters: [...chapters[workId]!]);
  }

  @override
  Future<WorkSummary> updateWork(
    String workId, {
    String? title,
    bool? published,
  }) async {
    if (title != null) titles[workId] = title;
    if (published != null) this.published[workId] = published;
    return _summary(workId);
  }
}
