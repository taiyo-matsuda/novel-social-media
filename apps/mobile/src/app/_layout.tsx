import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useColorScheme } from "react-native";

import { AuthProvider, useAuth } from "@/features/auth/auth-provider";

// ログイン状態を読み込むまでスプラッシュ画面を出したままにする
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * ログイン状態で見せる画面を切り替える。
 * - 未ログイン：ログイン画面
 * - ログイン済みで好みが未入力：冒頭文の画面
 * - 好みを伝え終えた：ホーム（冒頭文の画面はホームから選び直しに使う）
 */
function RootStack() {
  const { initialized, session, onboarded } = useAuth();

  useEffect(() => {
    if (initialized) SplashScreen.hide();
  }, [initialized]);

  const signedIn = session !== null;
  return (
    <Stack>
      <Stack.Protected guard={signedIn && onboarded === true}>
        <Stack.Screen name="index" options={{ title: "AI小説SNS" }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded !== null}>
        <Stack.Screen
          name="openings"
          options={{ title: "好みを教えてください" }}
        />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded === null}>
        <Stack.Screen name="loading" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
