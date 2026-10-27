import "./local-storage";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Supabase のクライアント。接続先が設定されていなければ null（画面側で案内を出す）。
 * ログイン状態はこの端末に保存し、次回起動時もログインしたままにする。
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (client) return client;

  // Web のサーバー側レンダリングでは localStorage がないので保存しない
  const canPersist = typeof localStorage !== "undefined";
  client = createClient(url, anonKey, {
    auth: {
      storage: canPersist ? localStorage : undefined,
      persistSession: canPersist,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  // アプリが前面にあるときだけトークンを自動更新する（Supabase の推奨）
  if (Platform.OS !== "web") {
    AppState.addEventListener("change", (state) => {
      if (state === "active") client?.auth.startAutoRefresh();
      else client?.auth.stopAutoRefresh();
    });
  }
  return client;
}
