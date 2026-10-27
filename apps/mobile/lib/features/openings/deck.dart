/// 冒頭文（運営が用意する短い書き出し）
class Opening {
  const Opening({required this.id, required this.text, this.genre});

  final int id;
  final String text;
  final String? genre;

  factory Opening.fromJson(Map<String, dynamic> json) => Opening(
    id: json['id'] as int,
    text: json['text'] as String,
    genre: json['genre'] as String?,
  );
}

/// 冒頭文への「読みたい（true）／読みたくない（false）」。キーは冒頭文のID
typedef OpeningChoices = Map<int, bool>;

/// 好みを伝え終えたとみなす最小の回答数（packages/core/src/openings/deck.ts と同じ値にする）
const minChoices = 3;

/// まだ答えていない最初の冒頭文。全部答えたら null
Opening? nextOpening(List<Opening> openings, OpeningChoices choices) {
  for (final o in openings) {
    if (!choices.containsKey(o.id)) return o;
  }
  return null;
}

int likedCount(OpeningChoices choices) =>
    choices.values.where((wantsToRead) => wantsToRead).length;

/// 「この好みで始める」を押せるか。
/// 何も読みたくないままだとAIが手がかりを持てないので、「読みたい」が1つ以上必要。
bool canFinish(OpeningChoices choices) =>
    choices.length >= minChoices && likedCount(choices) >= 1;

/// 全部「読みたくない」で使い切ったときなど、もう選べるものがないのに始められない状態
bool isStuck(List<Opening> openings, OpeningChoices choices) =>
    nextOpening(openings, choices) == null && !canFinish(choices);
