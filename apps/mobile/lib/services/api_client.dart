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

  /// 端末で Google にログインして受け取った ID トークンでログインする。初めてなら登録される
  Future<SessionUser> signInWithGoogle(String idToken) =>
      _signIn('/api/auth/sign-in/social', {
        'provider': 'google',
        'idToken': {'token': idToken},
      });

  Future<SessionUser> _signIn(String path, Map<String, Object> body) async {
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
}
