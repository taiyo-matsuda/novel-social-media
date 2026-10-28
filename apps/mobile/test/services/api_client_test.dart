import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:novel_sns/services/api_client.dart';
import 'package:novel_sns/services/token_store.dart';

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

  group('小説を書く', () {
    test('空の展開リクエストは送らず、新しい作品の章を受け取る', () async {
      final api = clientWith(
        (_) async => jsonResponse({
          'workId': 'w1',
          'chapter': {'position': 1, 'title': '古書店', 'body': '本文'},
        }),
      );
      final res = await api.generateChapter(plotRequest: '  ');
      expect(jsonDecode(sent.single.body), <String, dynamic>{});
      expect(res.workId, 'w1');
      expect(res.chapter.title, '古書店');
    });

    test('続きの章には作品IDと展開リクエストを送る', () async {
      final api = clientWith(
        (_) async => jsonResponse({
          'workId': 'w1',
          'chapter': {'position': 2, 'title': '二', 'body': '本文'},
        }),
      );
      await api.generateChapter(workId: 'w1', plotRequest: ' 犯人を明かして ');
      expect(jsonDecode(sent.single.body), {
        'workId': 'w1',
        'plotRequest': '犯人を明かして',
      });
    });

    test('作品と章を読み、D1 の日時を UTC として解釈する', () async {
      final api = clientWith(
        (_) async => jsonResponse({
          'work': {
            'id': 'w1',
            'title': '古書店',
            'status': 'published',
            'chapterCount': 1,
            'publishedAt': '2026-10-28 01:00:00',
            'updatedAt': '2026-10-28 00:30:00',
            'chapters': [
              {
                'position': 1,
                'title': '古書店',
                'body': '本文',
                'plotRequest': null,
              },
            ],
          },
        }),
      );
      final work = await api.fetchOwnWork('w1');
      expect(sent.single.url.path, '/api/works/w1');
      expect(work.summary.published, isTrue);
      expect(work.summary.publishedAt, DateTime.utc(2026, 10, 28, 1));
      expect(work.chapters.single.plotRequest, isNull);
    });

    test('公開状態の変更は PATCH で送る', () async {
      final api = clientWith(
        (_) async => jsonResponse({
          'id': 'w1',
          'title': '古書店',
          'status': 'draft',
          'chapterCount': 1,
          'publishedAt': null,
          'updatedAt': '2026-10-28 00:30:00',
        }),
      );
      final work = await api.updateWork('w1', published: false);
      expect(sent.single.method, 'PATCH');
      expect(jsonDecode(sent.single.body), {'published': false});
      expect(work.published, isFalse);
    });
  });

  group('みんなの作品', () {
    const summary = {
      'id': 'w1',
      'title': '古書店の少女',
      'authorId': 'u2',
      'authorName': '太郎',
      'chapterCount': 2,
      'publishedAt': '2026-10-28 01:00:00',
      'readers': 3,
      'likes': 1,
    };

    test('ランキング一覧を読み込む', () async {
      final api = clientWith(
        (_) async => jsonResponse({
          'works': [summary],
        }),
      );
      final works = await api.fetchPublicWorks();
      expect(sent.single.url.path, '/api/public-works');
      expect(works.single.authorName, '太郎');
      expect(works.single.publishedAt, DateTime.utc(2026, 10, 28, 1));
    });

    test('作品と全章を読み、展開リクエストは持たない', () async {
      final api = clientWith(
        (_) async => jsonResponse({
          'work': {
            ...summary,
            'isMine': false,
            'likedByMe': true,
            'chapters': [
              {'position': 1, 'title': '古書店', 'body': '本文'},
            ],
          },
        }),
      );
      final work = await api.fetchPublicWork('w1');
      expect(sent.single.url.path, '/api/public-works/w1');
      expect(work.likedByMe, isTrue);
      expect(work.chapters.single.plotRequest, isNull);
    });

    test('読んだ記録と高評価を送る', () async {
      final api = clientWith(
        (req) async => req.url.path.endsWith('/like')
            ? jsonResponse({'liked': true, 'likes': 2})
            : jsonResponse(null, status: 204),
      );
      await api.recordRead('w1', 2, ReadKind.complete);
      expect(sent.last.url.path, '/api/public-works/w1/reads');
      expect(jsonDecode(sent.last.body), {'position': 2, 'kind': 'complete'});

      await api.recordRead('w1', 1, ReadKind.leave, progress: 0.4);
      expect(jsonDecode(sent.last.body), {
        'position': 1,
        'kind': 'leave',
        'progress': 0.4,
      });

      expect(await api.setLike('w1', liked: true), 2);
      expect(sent.last.method, 'PUT');
      expect(jsonDecode(sent.last.body), {'liked': true});
    });
  });

  group('通報・ブロック・退会', () {
    test('通報は理由の名前と、空でない補足だけを送る', () async {
      final api = clientWith((_) async => jsonResponse(null, status: 204));
      await api.reportWork('w1', ReportReason.spam, detail: '  ');
      expect(sent.last.url.path, '/api/public-works/w1/reports');
      expect(jsonDecode(sent.last.body), {'reason': 'spam'});

      await api.reportWork('w1', ReportReason.other, detail: ' 宣伝です ');
      expect(jsonDecode(sent.last.body), {'reason': 'other', 'detail': '宣伝です'});
    });

    test('ブロックした人を読み、ブロックは PUT、解除は DELETE で送る', () async {
      final api = clientWith(
        (req) async => req.method == 'GET'
            ? jsonResponse({
                'blocks': [
                  {
                    'userId': 'u2',
                    'name': '太郎',
                    'blockedAt': '2026-10-28 01:00:00',
                  },
                ],
              })
            : jsonResponse(null, status: 204),
      );
      final blocks = await api.fetchBlocks();
      expect(blocks.single.name, '太郎');
      expect(blocks.single.blockedAt, DateTime.utc(2026, 10, 28, 1));

      await api.block('u2');
      expect((sent.last.method, sent.last.url.path), ('PUT', '/api/blocks/u2'));
      await api.unblock('u2');
      expect(
        (sent.last.method, sent.last.url.path),
        ('DELETE', '/api/blocks/u2'),
      );
    });

    test('退会できたら端末のトークンを消し、パスワード違いはエラーコードを渡す', () async {
      tokens.token = 'signed.token';
      var fail = true;
      final api = clientWith(
        (_) async => fail
            ? jsonResponse({
                'code': 'INVALID_PASSWORD',
                'message': 'Invalid password',
              }, status: 400)
            : jsonResponse({'success': true, 'message': 'User deleted'}),
      );
      await expectLater(
        api.deleteAccount('wrong'),
        throwsA(
          isA<ApiException>().having((e) => e.code, 'code', 'INVALID_PASSWORD'),
        ),
      );
      expect(tokens.token, 'signed.token');

      fail = false;
      await api.deleteAccount('password123');
      expect(sent.last.url.path, '/api/auth/delete-user');
      expect(sent.last.headers['Authorization'], 'Bearer signed.token');
      expect(jsonDecode(sent.last.body), {'password': 'password123'});
      expect(tokens.token, isNull);
    });
  });
}
