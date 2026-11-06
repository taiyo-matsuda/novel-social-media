import '../../services/api_client.dart';

/// 異議の長さの上限（packages/core/src/api の appealRequestSchema と同じ）
const maxAppealLength = 1000;

/// 運営が非表示・取り下げにした自分の作品に出す知らせ。問題なしなら null。
/// 相手を責める言い方はせず、規約に基づくことと、異議を出せることだけを伝える
String? moderationNotice(WorkSummary work) => switch (work.moderation) {
  WorkModeration.ok => null,
  WorkModeration.hidden =>
    '通報を受けたため、運営が確認するまでこの作品をほかの人に見せないようにしています。'
        '問題がなければ元に戻します。',
  WorkModeration.removed => '利用規約に基づき、この作品を非公開にしました。',
};
