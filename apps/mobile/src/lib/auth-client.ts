import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { API_URL } from "./config";

/**
 * ログイン（Better Auth）のクライアント。
 * スマホではログイン状態のクッキーを端末の安全な保存領域（Keychain / Keystore）に保存し、次回起動時もログインしたままにする。
 * ブラウザで試すときはブラウザのクッキーを使う。
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions:
    Platform.OS === "web" ? { credentials: "include" as const } : undefined,
  plugins: [
    expoClient({
      scheme: "novelsns",
      storagePrefix: "novelsns",
      storage: SecureStore,
    }),
  ],
});

/** API を呼ぶときに付ける認証情報（スマホはクッキーのヘッダー、ブラウザは credentials） */
export async function authRequestInit(): Promise<RequestInit> {
  if (Platform.OS === "web") return { credentials: "include" };
  const cookie = await authClient.getCookie();
  return cookie ? { headers: { Cookie: cookie } } : {};
}
