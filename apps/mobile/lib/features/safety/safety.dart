import '../../services/api_client.dart';

/// 通報の理由を選ぶときに見せる文
String reportReasonLabel(ReportReason reason) => switch (reason) {
  ReportReason.sexual => '性的な内容',
  ReportReason.violence => '暴力的・残酷な内容',
  ReportReason.harassment => '誹謗中傷・差別',
  ReportReason.spam => 'スパム・宣伝',
  ReportReason.rights => '著作権などの権利侵害',
  ReportReason.other => 'その他',
};

/// 通報の補足の最長の長さ（サーバーの reportWorkRequestSchema と同じ値にする）
const maxReportDetailLength = 500;

/// 退会に失敗したときに画面に出す文
String deleteAccountErrorMessage(Object error) {
  if (error is ApiException) {
    if (error.code == 'INVALID_PASSWORD') return 'パスワードが違います。';
    if (error.status == 429) return '試行が続いたため、少し時間をおいてからお試しください。';
  }
  return '退会できませんでした。通信状態を確かめて、もう一度お試しください。';
}
