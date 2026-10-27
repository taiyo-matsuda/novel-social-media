import {
  authErrorMessage,
  isValidEmail,
  isValidPassword,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
} from "@novel/core/auth";
import { useTheme } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { authClient } from "@/lib/auth-client";

type Mode = "signUp" | "signIn";

/** 表示名の初期値。あとでプロフィール画面から変えられるようにする */
const DEFAULT_NAME = "読者";

/**
 * メールアドレスとパスワードで登録・ログインする。確認メールは送らない。
 * 成功するとログイン状態が変わり、ルートが次の画面へ切り替える。
 */
export default function SignInScreen() {
  const { colors } = useTheme();
  const [mode, setMode] = useState<Mode>("signUp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = isValidEmail(email) && isValidPassword(password);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const credentials = { email: normalizeEmail(email), password };
    const { error } =
      mode === "signUp"
        ? await authClient.signUp.email({ ...credentials, name: DEFAULT_NAME })
        : await authClient.signIn.email(credentials);
    setBusy(false);
    if (error) setError(authErrorMessage(error));
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  const inputStyle = [
    styles.input,
    { color: colors.text, borderColor: colors.border },
  ];

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>
            あなた専用の小説を、AIが書きます
          </Text>
          <Text style={[styles.body, { color: colors.text }]}>
            好みを伝えると、AIがあなただけの小説を書きます。気に入った作品は公開して、ほかの人の作品も読めます。
          </Text>

          <View style={[styles.tabs, { borderColor: colors.border }]}>
            {(
              [
                ["signUp", "はじめての方"],
                ["signIn", "ログイン"],
              ] as const
            ).map(([value, label]) => {
              const selected = mode === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => switchMode(value)}
                  style={[
                    styles.tab,
                    selected && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: selected ? "#fff" : colors.text },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>
            メールアドレス
          </Text>
          <TextInput
            style={inputStyle}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType={mode === "signUp" ? "username" : "emailAddress"}
          />

          <Text style={[styles.label, { color: colors.text }]}>パスワード</Text>
          <TextInput
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            placeholder={`${MIN_PASSWORD_LENGTH}文字以上`}
            placeholderTextColor="#999"
            secureTextEntry
            autoCapitalize="none"
            autoComplete={
              mode === "signUp" ? "new-password" : "current-password"
            }
            textContentType={mode === "signUp" ? "newPassword" : "password"}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          {mode === "signUp" && (
            <Text style={[styles.hint, { color: colors.text }]}>
              確認メールは届きません。登録するとすぐに始められます。
            </Text>
          )}

          <Button
            label={mode === "signUp" ? "登録して始める" : "ログイン"}
            onPress={submit}
            disabled={!canSubmit}
            loading={busy}
          />

          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 24, gap: 16, flexGrow: 1, justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "bold" },
  body: { fontSize: 16, lineHeight: 26 },
  tabs: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: { fontSize: 15, fontWeight: "600" },
  label: { fontSize: 15, fontWeight: "600", marginTop: 8 },
  hint: { fontSize: 13, lineHeight: 20, opacity: 0.6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    fontSize: 17,
  },
  error: { color: "#d33", fontSize: 15, lineHeight: 22 },
});
