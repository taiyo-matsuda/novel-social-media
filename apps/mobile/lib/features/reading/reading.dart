import 'package:flutter/widgets.dart';

import '../../services/api_client.dart';

/// ランキング一覧に出す作品の説明（例：「太郎・3章・4人が読んだ・高評価 2」）
String publicWorkLabel(PublicWorkSummary work) => [
  work.authorName,
  '${work.chapterCount}章',
  if (work.readers > 0) '${work.readers}人が読んだ',
  if (work.likes > 0) '高評価 ${work.likes}',
].join('・');

/// 章の終わりまで読んだとみなす、下端からの余白
const chapterEndMargin = 48.0;

/// 章の終わりまで画面を送ったか。画面に収まる短い章は表示しただけで読み終えた扱い
bool reachedChapterEnd(ScrollMetrics metrics) =>
    metrics.pixels >= metrics.maxScrollExtent - chapterEndMargin;

/// 読んだ記録を同じ画面で二度送らないための控え
class ReadTracker {
  final _sent = <(int, ReadKind)>{};

  /// まだ送っていなければ控えて true を返す
  bool mark(int position, ReadKind kind) => _sent.add((position, kind));
}
