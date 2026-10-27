import {
  isValidEmail,
  isValidOtp,
  normalizeEmail,
  normalizeOtp,
  OTP_LENGTH,
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { useAuth } from "@/features/auth/auth-provider";

/**
 * メールアドレスに届く6桁のコードでログインする。初めての人はそのまま登録になる。
 * パスワードを覚えなくてよく、アプリに戻るためのリンク設定も要らない。
 */
export default function SignInScreen() {
  const { colors } = useTheme();
  const { db } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!db) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: colors.background }]}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[styles.title, { color: colors.text }]}>
            接続先が設定されていません
          </Text>
          <Text style={[styles.body, { color: colors.text }]}>
            apps/mobile/.env.local に EXPO_PUBLIC_SUPABASE_URL と
            EXPO_PUBLIC_SUPABASE_ANON_KEY
            を設定してから、アプリを起動し直してください。
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  async function sendCode() {
    if (!db) return;
    setBusy(true);
    setError(null);
    const { error } = await db.auth.signInWithOtp({
      email: normalizeEmail(email),
    });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "送信が続いたため、少し時間をおいてからお試しください。"
          : "コードを送れませんでした。メールアドレスを確かめてください。",
      );
      return;
    }
    setCode("");
    setStep("code");
  }

  async function verifyCode() {
    if (!db) return;
    setBusy(true);
    setError(null);
    const { error } = await db.auth.verifyOtp({
      email: normalizeEmail(email),
      token: normalizeOtp(code),
      type: "email",
    });
    setBusy(false);
    // 成功するとログイン状態が変わり、ルートが次の画面へ切り替える
    if (error) {
      setError("コードが違うか、有効期限が切れています。");
    }
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

          {step === "email" ? (
            <>
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
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={() => isValidEmail(email) && sendCode()}
              />
              <Text style={[styles.hint, { color: colors.text }]}>
                ログイン用のコードをメールで送ります。初めての方もこのまま始められます。
              </Text>
              <Button
                label="コードを送る"
                onPress={sendCode}
                disabled={!isValidEmail(email)}
                loading={busy}
              />
            </>
          ) : (
            <>
              <Text style={[styles.body, { color: colors.text }]}>
                {normalizeEmail(email)} に{OTP_LENGTH}
                桁のコードを送りました。メールに書かれたコードを入力してください。
              </Text>
              <TextInput
                style={[inputStyle, styles.codeInput]}
                value={code}
                onChangeText={setCode}
                placeholder={"0".repeat(OTP_LENGTH)}
                placeholderTextColor="#999"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={OTP_LENGTH + 2}
                autoFocus
              />
              <Button
                label="ログイン"
                onPress={verifyCode}
                disabled={!isValidOtp(code)}
                loading={busy}
              />
              <Pressable onPress={sendCode} disabled={busy}>
                <Text style={[styles.link, { color: colors.primary }]}>
                  コードを送り直す
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setStep("email");
                  setError(null);
                }}
                disabled={busy}
              >
                <Text style={[styles.link, { color: colors.primary }]}>
                  メールアドレスを変える
                </Text>
              </Pressable>
            </>
          )}

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
  label: { fontSize: 15, fontWeight: "600", marginTop: 16 },
  hint: { fontSize: 13, lineHeight: 20, opacity: 0.6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    fontSize: 17,
  },
  codeInput: { fontSize: 28, letterSpacing: 8, textAlign: "center" },
  link: { fontSize: 15, textAlign: "center", paddingVertical: 8 },
  error: { color: "#d33", fontSize: 15, lineHeight: 22 },
});
