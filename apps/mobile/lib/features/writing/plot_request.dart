import '../../services/api_client.dart';

/// 展開リクエストの最大文字数（packages/core/src/api の generateChapterRequestSchema と同じ値にする）
const maxPlotRequestLength = 500;

/// 第1章を書いてもらうときに出す「こんな話が読みたい」の例
const firstChapterSuggestions = [
  '主人公は高校生',
  '舞台は現代の日本',
  '少し切ない話',
  '最後に大どんでん返し',
  '会話多めで軽く読める',
];

/// 続きを書いてもらうときに出す「次はこうしてほしい」の例
const nextChapterSuggestions = [
  'もっと盛り上げて',
  '新しい人物を出して',
  '謎を一つ明かして',
  '恋愛の要素を増やして',
  'ここで物語を完結させて',
];

/// 入力欄の後ろに例を付け足す。空でなければ「。」で区切り、同じ例は二度足さない
String appendSuggestion(String current, String suggestion) {
  final text = current.trimRight();
  if (text.isEmpty) return suggestion;
  if (text.contains(suggestion)) return text;
  final separator = RegExp(r'[。、！？!?]$').hasMatch(text) ? '' : '。';
  return '$text$separator$suggestion';
}

/// 入力が長すぎるときのエラー文。問題なければ null
String? plotRequestError(String text) {
  final length = text.trim().length;
  if (length <= maxPlotRequestLength) return null;
  return '$maxPlotRequestLength文字以内にしてください（いま$length文字）';
}

/// 章の生成に失敗したときに見せる文。AIに断られたときはサーバーの説明をそのまま出す
String generationErrorMessage(Object error) {
  if (error is ApiException) {
    return switch (error.status) {
      401 => 'ログインが切れました。ログインし直してください。',
      404 => '作品が見つかりませんでした。',
      422 => '${error.message}。リクエストの内容を変えて、もう一度試してください。',
      _ => '書いてもらえませんでした。時間をおいて、もう一度試してください。',
    };
  }
  return '通信できませんでした。電波の良いところで、もう一度試してください。';
}

/// 一覧に出す作品の状態（例：「公開中・3章」）
String workStatusLabel(WorkSummary work) =>
    '${work.published ? '公開中' : '下書き'}・${work.chapterCount}章';
