import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tsuzuri/services/api_client.dart';
import 'package:tsuzuri/services/token_store.dart';

const base = 'http://api.test';
const user = {'id': 'u1', 'email': 'taro@example.com', 'name': '読者'};

http.Response jsonResponse(
  Object? body, {
  int status = 200,
  Map<String, String> headers = const {},
}) => http.Response.bytes(
  body == null ? [] : utf8.encode(jsonEncode(body)),
  status,
  headers: {'content-type': 'application/json', ...headers},
);

void main() {
  late MemoryTokenStore tokens;
  late List<http.Request> sent;

  ApiClient clientWith(Future<http.Response> Function(http.Request) handler) {
    return ApiClient(
      baseUrl: base,
      tokens: tokens,
      client: MockClient((req) {
        sent.add(req);
        return handler(req);
      }),
    );
  }

  setUp(() {
    tokens = MemoryTokenStore();
    sent = [];
  });

  group('ログイン', () {
    test('登録すると set-auth-token のトークンを保存する', () async {
      final api = clientWith(
        (_) async => jsonResponse(
          {'token': 'raw', 'user': user},
          headers: {'set-auth-token': 'signed.token'},
        ),
      );
      final u = await api.signUp(
        email: 'taro@example.com',
        password: 'password123',
        name: '読者',
      );
      expect(u.email, 'taro@example.com');
      expect(tokens.token, 'signed.token');
      expect(sent.single.url.path, '/api/auth/sign-up/email');
      expect(jsonDecode(sent.single.body), containsPair('name', '読者'));
    });

    test('ログインに失敗したら Better Auth のエラーコードを渡す', () async {
      final api = clientWith(
        (_) async => jsonResponse({
          'code': 'INVALID_EMAIL_OR_PASSWORD',
          'message': 'Invalid email or password',
        }, status: 401),
      );
      await expectLater(
        api.signIn(email: 'taro@example.com', password: 'wrong-password'),
        throwsA(
          isA<ApiException>()
              .having((e) => e.status, 'status', 401)
              .having((e) => e.code, 'code', 'INVALID_EMAIL_OR_PASSWORD'),
        ),
      );
      expect(tokens.token, isNull);
    });

    test('Google の ID トークンを sign-in/social に送ってログインする', () async {
      final api = clientWith(
        (_) async => jsonResponse(
          {'redirect': false, 'token': 'raw', 'user': user},
          headers: {'set-auth-token': 'signed.token'},
        ),
      );
      await api.signInWithGoogle('google-id-token');
      expect(sent.single.url.path, '/api/auth/sign-in/social');
      expect(jsonDecode(sent.single.body), {
        'provider': 'google',
        'idToken': {'token': 'google-id-token'},
      });
      expect(tokens.token, 'signed.token');
    });

    test('トークンがなければサーバーに聞かずに未ログイン', () async {
      final api = clientWith((_) async => fail('呼ばれないはず'));
      expect(await api.getSession(), isNull);
    });

    test('トークンが無効になっていたら消して未ログインにする', () async {
      tokens.token = 'old.token';
      final api = clientWith((_) async => jsonResponse(null));
      expect(await api.getSession(), isNull);
      expect(tokens.token, isNull);
      expect(sent.single.headers['Authorization'], 'Bearer old.token');
    });

    test('ログアウトは通信に失敗しても端末のトークンを消す', () async {
      tokens.token = 'signed.token';
      final api = clientWith((_) async => jsonResponse({}, status: 500));
      await expectLater(api.signOut(), throwsA(isA<ApiException>()));
      expect(tokens.token, isNull);
    });
  });

  group('冒頭文', () {
    test('冒頭文と本人の答えを読み込む', () async {
      tokens.token = 'signed.token';
      final api = clientWith((req) async {
        return switch (req.url.path) {
          '/api/openings' => jsonResponse({
            'openings': [
              {'id': 1, 'text': '雨の夜だった。', 'genre': 'ミステリー'},
              {'id': 2, 'text': '春が来た。', 'genre': null},
            ],
          }),
          '/api/opening-choices' => jsonResponse({
            'choices': [
              {'openingId': 1, 'wantsToRead': true},
            ],
          }),
          _ => jsonResponse({}, status: 404),
        };
      });
      final openings = await api.fetchOpenings();
      expect(openings.map((o) => o.text), ['雨の夜だった。', '春が来た。']);
      expect(await api.fetchOwnChoices(), {1: true});
    });

    test('答えを PUT で保存する', () async {
      tokens.token = 'signed.token';
      final api = clientWith((_) async => http.Response('', 204));
      await api.saveChoice(3, false);
      final req = sent.single;
      expect(req.method, 'PUT');
      expect(req.url.path, '/api/opening-choices/3');
      expect(jsonDecode(req.body), {'wantsToRead': false});
      expect(req.headers['Authorization'], 'Bearer signed.token');
    });

    test('サーバーのエラー文を ApiException にする', () async {
      final api = clientWith(
        (_) async => jsonResponse({'error': 'ログインが必要です'}, status: 401),
      );
      await expectLater(
        api.fetchOwnChoices(),
        throwsA(
          isA<ApiException>().having((e) => e.message, 'message', 'ログインが必要です'),
        ),
      );
    });
  });
}
