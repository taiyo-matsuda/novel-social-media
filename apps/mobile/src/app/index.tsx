import { useTheme } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";

export default function HomeScreen() {
  const { colors } = useTheme();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        あなた専用の小説を、AIが書きます
      </Text>
      <Text style={[styles.body, { color: colors.text }]}>
        好みを伝えると、AIが自分だけの小説を書きます。書いた作品は公開して、ランキングで他の人の作品も読めます。
      </Text>
      <Text style={[styles.note, { color: colors.text }]}>開発中です。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "bold" },
  body: { fontSize: 16, lineHeight: 26 },
  note: { fontSize: 14, opacity: 0.6 },
});
