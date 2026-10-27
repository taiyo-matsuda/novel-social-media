import {
  canFinish,
  isStuck,
  likedCount,
  MIN_CHOICES,
  nextOpening,
  type Opening,
} from "@novel/core/openings";
import { router, useTheme } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/button";
import { useSignedIn } from "@/features/auth/auth-provider";
import {
  clearChoices,
  fetchOpenings,
  fetchOwnChoices,
  saveChoice,
} from "@/lib/api";

/**
 * 最初の画面：短い冒頭文を1つずつ見せて「読みたい／読みたくない」を選んでもらう。
 * 選んだ結果は AI が第1章を書くときの手がかりになる。
 */
export default function OpeningsScreen() {
  const { colors } = useTheme();
  const { refreshOnboarded } = useSignedIn();
  const [openings, setOpenings] = useState<Opening[] | null>(null);
  const [choices, setChoices] = useState<Map<number, boolean>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // 増やすと読み込み直す
  const [loadCount, setLoadCount] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([fetchOpenings(), fetchOwnChoices()])
      .then(([list, own]) => {
        if (!active) return;
        setOpenings(list);
        setChoices(own);
      })
      .catch(() => {
        if (active) setError("冒頭文を読み込めませんでした。");
      });
    return () => {
      active = false;
    };
  }, [loadCount]);

  async function choose(opening: Opening, wantsToRead: boolean) {
    const before = choices;
    // 待たせないよう先に画面を進め、保存に失敗したら戻す
    setChoices(new Map(before).set(opening.id, wantsToRead));
    try {
      await saveChoice(opening.id, wantsToRead);
    } catch {
      setChoices(before);
      setError("保存できませんでした。もう一度選んでください。");
    }
  }

  async function startOver() {
    try {
      await clearChoices();
      setChoices(new Map());
      setError(null);
    } catch {
      setError("選び直しの準備ができませんでした。");
    }
  }

  async function finish() {
    setFinishing(true);
    await refreshOnboarded();
    setFinishing(false);
    router.replace("/");
  }

  const textColor = { color: colors.text };

  if (openings === null) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {error ? (
          <>
            <Text style={[styles.body, textColor]}>{error}</Text>
            <Button
              label="もう一度読み込む"
              onPress={() => {
                setError(null);
                setLoadCount((n) => n + 1);
              }}
            />
          </>
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
      </View>
    );
  }

  const current = nextOpening(openings, choices);
  const answered = Math.min(choices.size, openings.length);
  const ready = canFinish(choices);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.lead, textColor]}>
        書き出しを読んで、続きを読みたいかどうかを選んでください。{MIN_CHOICES}
        つ以上選ぶと始められます。
      </Text>
      <Text style={[styles.progress, textColor]}>
        {answered} / {openings.length}　・　読みたい {likedCount(choices)}
      </Text>

      {current ? (
        <>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {current.genre && (
              <Text style={[styles.genre, { color: colors.primary }]}>
                {current.genre}
              </Text>
            )}
            <Text style={[styles.opening, textColor]}>{current.text}</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                label="読みたくない"
                variant="secondary"
                onPress={() => choose(current, false)}
              />
            </View>
            <View style={styles.flex}>
              <Button label="読みたい" onPress={() => choose(current, true)} />
            </View>
          </View>
        </>
      ) : isStuck(openings, choices) ? (
        <Text style={[styles.body, textColor]}>
          今回は読みたい書き出しがありませんでした。もう一度見直してみてください。
        </Text>
      ) : (
        <Text style={[styles.body, textColor]}>
          すべての書き出しを選び終えました。
        </Text>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {ready && (
        <Button
          label="この好みで始める"
          variant={current ? "secondary" : "primary"}
          onPress={finish}
          loading={finishing}
        />
      )}
      {current === null && (
        <Button
          label="最初から選び直す"
          variant="secondary"
          onPress={startOver}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  container: { padding: 24, gap: 16 },
  lead: { fontSize: 15, lineHeight: 24 },
  progress: { fontSize: 13, opacity: 0.6 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    gap: 12,
    minHeight: 220,
    justifyContent: "center",
  },
  genre: { fontSize: 13, fontWeight: "600" },
  opening: {
    fontSize: 19,
    lineHeight: 34,
    fontFamily: Platform.select({
      ios: "Hiragino Mincho ProN",
      default: "serif",
    }),
  },
  row: { flexDirection: "row", gap: 12 },
  body: { fontSize: 16, lineHeight: 26 },
  error: { color: "#d33", fontSize: 15, lineHeight: 22 },
});
