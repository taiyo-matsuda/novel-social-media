import { useTheme } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";

/** ログイン直後、好みを入力済みか確認している間に出す画面 */
export default function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
