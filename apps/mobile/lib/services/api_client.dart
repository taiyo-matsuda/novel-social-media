import 'dart:convert';

import 'package:http/http.dart' as http;

import '../features/openings/deck.dart';
import 'token_store.dart';

/// ログイン中の利用者
class SessionUser {
  const SessionUser({
    required this.id,
    required this.email,
    required this.name,
  });

  final String id;
  final String email;
  final String name;

  factory SessionUser.fromJson(Map<String, dynamic> json) => SessionUser(
    id: json['id'] as String,
    email: json['email'] as String,
    name: json['name'] as String,
  );
}

/// 作品一覧の1行（packages/core/src/api の WorkSummary）
class WorkSummary {
  const WorkSummary({
    required this.id,
    required this.title,
    required this.published,
    required this.chapterCount,
    required this.publishedAt,
    required this.updatedAt,
  });

  final String id;
  final String title;
  final bool published;
  final int chapterCount;
  final DateTime? publishedAt;
  final DateTime updatedAt;

  factory WorkSummary.fromJson(Map<String, dynamic> json) => WorkSummary(
    id: json['id'] as String,
    title: json['title'] as String,
    published: json['status'] == 'published',
    chapterCount: json['chapterCount'] as int,
    publishedAt: _parseTime(json['publishedAt'] as String?),
    updatedAt: _parseTime(json['updatedAt'] as String)!,
  );
}

/// 作品の1章（packages/core/src/api の ChapterView）
class Chapter {
  const Chapter({
    required this.position,
    required this.title,
    required this.body,
    this.plotRequest,
  });

  final int position;
  final String title;
  final String body;

  /// この章を書いてもらうときに出した展開リクエスト
  final String? plotRequest;

  factory Chapter.fromJson(Map<String, dynamic> json) => Chapter(
    position: json['position'] as int,
    title: json['title'] as String,
    body: json['body'] as String,
    plotRequest: json['plotRequest'] as String?,
  );
}

/// 本人の作品と全章（GET /api/works/:workId）
class Work {
  const Work({required this.summary, required this.chapters});

  final WorkSummary summary;
  final List<Chapter> chapters;

  factory Work.fromJson(Map<String, dynamic> json) => Work(
    summary: WorkSummary.fromJson(json),
    chapters: (json['chapters'] as List)
        .map((c) => Chapter.fromJson(c as Map<String, dynamic>))
        .toList(),
  );
}

/// 章を書いてもらった結果（POST /api/chapters）
class GeneratedChapter {
  const GeneratedChapter({required this.workId, required this.chapter});

  final String workId;
  final Chapter chapter;

  factory GeneratedChapter.fromJson(Map<String, dynamic> json) =>
      GeneratedChapter(
        workId: json['workId'] as String,
        chapter: Chapter.fromJson(json['chapter'] as Map<String, dynamic>),
      );
}

/// ランキング一覧の1行（packages/core/src/api の PublicWorkSummary）
class PublicWorkSummary {
  const PublicWorkSummary({
    required this.id,
    required this.title,
    required this.authorId,
    required this.authorName,
    required this.chapterCount,
    required this.publishedAt,
    required this.readers,
    required this.likes,
  });

  final String id;
  final String title;

  /// 作者の利用者ID（ブロックに使う）
  final String authorId;
  final String authorName;
  final int chapterCount;
  final DateTime publishedAt;

  /// 読み始めた人数（作者本人は数えない）
  final int readers;

  /// 高評価の数
  final int likes;

  factory PublicWorkSummary.fromJson(Map<String, dynamic> json) =>
      PublicWorkSummary(
        id: json['id'] as String,
        title: json['title'] as String,
        authorId: json['authorId'] as String,
        authorName: json['authorName'] as String,
        chapterCount: json['chapterCount'] as int,
        publishedAt: _parseTime(json['publishedAt'] as String)!,
        readers: json['readers'] as int,
        likes: json['likes'] as int,
      );
}

/// ほかの人の公開作品と全章（GET /api/public-works/:workId）。
/// 展開リクエストは作者の個人的なメモなので含まれない
class PublicWork {
  const PublicWork({
    required this.summary,
    required this.isMine,
    required this.likedByMe,
    required this.chapters,
  });

  final PublicWorkSummary summary;

  /// 自分の作品か（自分の作品には高評価を付けられない）
  final bool isMine;
  final bool likedByMe;
  final List<Chapter> chapters;

  factory PublicWork.fromJson(Map<String, dynamic> json) => PublicWork(
    summary: PublicWorkSummary.fromJson(json),
    isMine: json['isMine'] as bool,
    likedByMe: json['likedByMe'] as bool,
    chapters: (json['chapters'] as List)
        .map((c) => Chapter.fromJson(c as Map<String, dynamic>))
        .toList(),
  );
}

/// 章を読み始めた・読み終えた・読み終えずに離れた（POST /api/public-works/:workId/reads の kind）
enum ReadKind { start, complete, leave }

/// 通報の理由（packages/core/src/api の reportReasons。名前をそのまま送る）
enum ReportReason { sexual, violence, harassment, spam, rights, other }

/// ブロックした人（GET /api/blocks）。メールアドレスは含まれない
class BlockedUser {
  const BlockedUser({
    required this.userId,
    required this.name,
    required this.blockedAt,
  });

  final String userId;
  final String name;
  final DateTime blockedAt;

  factory BlockedUser.fromJson(Map<String, dynamic> json) => BlockedUser(
    userId: json['userId'] as String,
    name: json['name'] as String,
    blockedAt: _parseTime(json['blockedAt'] as String)!,
  );
}

/// D1 の datetime('now')（"2026-10-28 01:00:00"、UTC）と ISO 形式のどちらも読む
DateTime? _parseTime(String? value) {
  if (value == null) return null;
  final iso = value.contains('T') ? value : '${value.replaceFirst(' ', 'T')}Z';
  return DateTime.parse(iso);
}

/// サーバーがエラーを返した。[code] は Better Auth のエラーコード（ログイン以外は null）
class ApiException implements Exception {
  ApiException(this.status, this.message, {this.code});

  final int status;
  final String message;
  final String? code;

  @override
  String toString() => 'ApiException($status, $code, $message)';
}

/// サーバー（apps/api）を呼ぶ。ログイン中ならトークンを自動で付ける。
/// AIのAPIキーはアプリに入れず、AI生成も必ずサーバー経由で呼ぶ。
///
/// ログインは Better Auth の bearer プラグイン：登録・ログインの応答の `set-auth-token` ヘッダーを保存し、
/// 以後は `Authorization: Bearer <トークン>` で送る。
class ApiClient {
  ApiClient({required this.baseUrl, required this.tokens, http.Client? client})
    : _client = client ?? http.Client();

  final String baseUrl;
  final TokenStore tokens;
  final http.Client _client;

  Future<http.Response> _send(
    String method,
    String path, {
    Object? body,
  }) async {
    final token = await tokens.read();
    final request = http.Request(method, Uri.parse('$baseUrl$path'));
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    return http.Response.fromStream(await _client.send(request));
  }

  /// 成功なら JSON（中身がなければ null）を返し、失敗なら [ApiException] を投げる
  Future<dynamic> _request(String method, String path, {Object? body}) async {
    final res = await _send(method, path, body: body);
    final json = _decode(res);
    if (res.statusCode >= 400) {
      final map = json is Map<String, dynamic>
          ? json
          : const <String, dynamic>{};
      throw ApiException(
        res.statusCode,
        (map['error'] ?? map['message'] ?? 'エラーが発生しました') as String,
        code: map['code'] as String?,
      );
    }
    return json;
  }

  static dynamic _decode(http.Response res) {
    if (res.body.isEmpty) return null;
    try {
      return jsonDecode(utf8.decode(res.bodyBytes));
    } on FormatException {
      return null;
    }
  }

  // ---- ログイン ----

  /// 保存してあるトークンでログイン中の利用者を取る。ログインしていなければ null
  Future<SessionUser?> getSession() async {
    if (await tokens.read() == null) return null;
    final json = await _request('GET', '/api/auth/get-session');
    if (json is! Map<String, dynamic> || json['user'] == null) {
      await tokens.write(null);
      return null;
    }
    return SessionUser.fromJson(json['user'] as Map<String, dynamic>);
  }

  /// 登録する。確認メールは送られず、そのままログイン状態になる
  Future<SessionUser> signUp({
    required String email,
    required String password,
    required String name,
  }) => _signIn('/api/auth/sign-up/email', {
    'email': email,
    'password': password,
    'name': name,
  });

  Future<SessionUser> signIn({
    required String email,
    required String password,
  }) => _signIn('/api/auth/sign-in/email', {
    'email': email,
    'password': password,
  });

  Future<SessionUser> _signIn(String path, Map<String, String> body) async {
    final res = await _send('POST', path, body: body);
    final json = _decode(res);
    final map = json is Map<String, dynamic> ? json : const <String, dynamic>{};
    final token = res.headers['set-auth-token'];
    if (res.statusCode >= 400 || token == null || map['user'] == null) {
      throw ApiException(
        res.statusCode,
        (map['message'] ?? 'ログインできませんでした') as String,
        code: map['code'] as String?,
      );
    }
    await tokens.write(token);
    return SessionUser.fromJson(map['user'] as Map<String, dynamic>);
  }

  /// ログアウトする。通信に失敗しても端末のトークンは消す
  Future<void> signOut() async {
    try {
      await _request(
        'POST',
        '/api/auth/sign-out',
        body: const <String, String>{},
      );
    } finally {
      await tokens.write(null);
    }
  }

  // ---- 冒頭文 ----

  /// 冒頭文を表示順に取得する。
  Future<List<Opening>> fetchOpenings() async {
    final json = await _request('GET', '/api/openings') as Map<String, dynamic>;
    return (json['openings'] as List)
        .map((o) => Opening.fromJson(o as Map<String, dynamic>))
        .toList();
  }

  /// 本人がこれまでに答えた「読みたい／読みたくない」。
  Future<OpeningChoices> fetchOwnChoices() async {
    final json =
        await _request('GET', '/api/opening-choices') as Map<String, dynamic>;
    return {
      for (final c in (json['choices'] as List).cast<Map<String, dynamic>>())
        c['openingId'] as int: c['wantsToRead'] as bool,
    };
  }

  /// 1つの冒頭文への答えを保存する（答え直したら上書き）。
  Future<void> saveChoice(int openingId, bool wantsToRead) => _request(
    'PUT',
    '/api/opening-choices/$openingId',
    body: {'wantsToRead': wantsToRead},
  );

  /// 選び直すときに、これまでの答えを消す。
  Future<void> clearChoices() => _request('DELETE', '/api/opening-choices');

  // ---- 小説を書く ----

  /// AIに章を書いてもらう。[workId] がなければ新しい作品の第1章になる。
  /// 生成には数十秒かかることがある。
  Future<GeneratedChapter> generateChapter({
    String? workId,
    String? plotRequest,
  }) async {
    final json = await _request(
      'POST',
      '/api/chapters',
      body: {
        'workId': ?workId,
        if (plotRequest != null && plotRequest.trim().isNotEmpty)
          'plotRequest': plotRequest.trim(),
      },
    ) as Map<String, dynamic>;
    return GeneratedChapter.fromJson(json);
  }

  /// 本人の作品を、最後に章が増えた順に取得する。
  Future<List<WorkSummary>> fetchOwnWorks() async {
    final json = await _request('GET', '/api/works') as Map<String, dynamic>;
    return (json['works'] as List)
        .map((w) => WorkSummary.fromJson(w as Map<String, dynamic>))
        .toList();
  }

  /// 本人の作品と全章を取得する。
  Future<Work> fetchOwnWork(String workId) async {
    final json =
        await _request('GET', '/api/works/$workId') as Map<String, dynamic>;
    return Work.fromJson(json['work'] as Map<String, dynamic>);
  }

  /// 題名を変える・公開／非公開を切り替える。
  Future<WorkSummary> updateWork(
    String workId, {
    String? title,
    bool? published,
  }) async {
    final json = await _request(
      'PATCH',
      '/api/works/$workId',
      body: {'title': ?title, 'published': ?published},
    ) as Map<String, dynamic>;
    return WorkSummary.fromJson(json);
  }

  // ---- みんなの作品 ----

  /// ほかの人の公開作品をランキング順に取得する。
  Future<List<PublicWorkSummary>> fetchPublicWorks() async {
    final json =
        await _request('GET', '/api/public-works') as Map<String, dynamic>;
    return (json['works'] as List)
        .map((w) => PublicWorkSummary.fromJson(w as Map<String, dynamic>))
        .toList();
  }

  /// 公開作品と全章を取得する（ログイン必須）。
  Future<PublicWork> fetchPublicWork(String workId) async {
    final json = await _request(
      'GET',
      '/api/public-works/$workId',
    ) as Map<String, dynamic>;
    return PublicWork.fromJson(json['work'] as Map<String, dynamic>);
  }

  /// 章を読み始めた・読み終えた・離れたことを記録する（ランキングと行動学習に使う）。
  /// 離れたとき（[ReadKind.leave]）は、どこまで読んだかを [progress]（0〜1）で送る。
  Future<void> recordRead(
    String workId,
    int position,
    ReadKind kind, {
    double? progress,
  }) => _request(
    'POST',
    '/api/public-works/$workId/reads',
    body: {'position': position, 'kind': kind.name, 'progress': ?progress},
  );

  /// 高評価を付ける・外す。付けたあとの高評価の数を返す。
  Future<int> setLike(String workId, {required bool liked}) async {
    final json = await _request(
      'PUT',
      '/api/public-works/$workId/like',
      body: {'liked': liked},
    ) as Map<String, dynamic>;
    return json['likes'] as int;
  }

  // ---- 通報・ブロック・退会 ----

  /// 作品を通報する。通報した作品は自分の一覧に出なくなる。
  Future<void> reportWork(
    String workId,
    ReportReason reason, {
    String? detail,
  }) => _request(
    'POST',
    '/api/public-works/$workId/reports',
    body: {
      'reason': reason.name,
      if (detail != null && detail.trim().isNotEmpty) 'detail': detail.trim(),
    },
  );

  /// ブロックした人を新しい順に取得する。
  Future<List<BlockedUser>> fetchBlocks() async {
    final json = await _request('GET', '/api/blocks') as Map<String, dynamic>;
    return (json['blocks'] as List)
        .map((b) => BlockedUser.fromJson(b as Map<String, dynamic>))
        .toList();
  }

  /// [userId] をブロックする。お互いの作品が見えなくなる。
  Future<void> block(String userId) => _request('PUT', '/api/blocks/$userId');

  /// ブロックを解除する。
  Future<void> unblock(String userId) =>
      _request('DELETE', '/api/blocks/$userId');

  /// 退会する。本人の作品も消える。パスワードが違えば [ApiException]（code: INVALID_PASSWORD）。
  /// 退会できたら端末のトークンを消す
  Future<void> deleteAccount(String password) async {
    await _request(
      'POST',
      '/api/auth/delete-user',
      body: {'password': password},
    );
    await tokens.write(null);
  }
}
