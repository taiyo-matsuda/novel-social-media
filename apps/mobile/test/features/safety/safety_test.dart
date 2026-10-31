import 'package:flutter_test/flutter_test.dart';
import 'package:tsuzuri/features/safety/safety.dart';
import 'package:tsuzuri/services/api_client.dart';

void main() {
  test('通報の理由はすべて日本語で見せる', () {
    for (final reason in ReportReason.values) {
      expect(reportReasonLabel(reason), isNotEmpty);
    }
    expect(reportReasonLabel(ReportReason.spam), 'スパム・宣伝');
  });

  test('退会の失敗は、パスワード違いとそれ以外で文を分ける', () {
    expect(
      deleteAccountErrorMessage(
        ApiException(400, 'Invalid password', code: 'INVALID_PASSWORD'),
      ),
      'パスワードが違います。',
    );
    expect(
      deleteAccountErrorMessage(ApiException(429, 'Too many requests')),
      contains('少し時間をおいて'),
    );
    expect(deleteAccountErrorMessage(Exception('offline')), contains('通信状態'));
  });
}
