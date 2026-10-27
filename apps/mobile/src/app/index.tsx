import { router, useTheme } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";

import { Button } from "@/components/button";
import { useSignedIn } from "@/features/auth/auth-provider";

export default function HomeScreen() {
  const { colors } = useTheme();
  const { session, signOut } = useSignedIn();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        好みを受け取りました
      </Text>
      <Text style={[styles.body, { color: colors.text }]}>
        選んでもらった書き出しをもとに、AIがあなた専用の小説を書きます。小説を書く画面は次に作ります。
      </Text>
      <Button
        label="好みを選び直す"
        variant="secondary"
        onPress={() => router.push("/openings")}
      />
      <Text style={[styles.note, { color: colors.text }]}>
        {session?.user.email} でログイン中
      </Text>
      <Button label="ログアウト" variant="secondary" onPress={signOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16 },
  title: { fontSize: 24, fontWeight: "bold" },
  body: { fontSize: 16, lineHeight: 26 },
  note: { fontSize: 14, opacity: 0.6, marginTop: 24 },
});
