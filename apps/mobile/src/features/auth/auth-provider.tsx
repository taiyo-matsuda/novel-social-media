import { canFinish } from "@novel/core/openings";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { fetchOwnChoices } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

type SessionUser = { id: string; email: string; name: string };

type AuthState = {
  /** 起動時にログイン状態を読み込み終えたか */
  initialized: boolean;
  user: SessionUser | null;
  /** 冒頭文で好みを伝え終えたか。確認中は null */
  onboarded: boolean | null;
  /** 冒頭文を選び終えたあとに呼び、onboarded を取り直す */
  refreshOnboarded: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const user = data?.user ?? null;
  const userId = user?.id;
  // どの利用者について確認した結果かも持ち、ログインし直したら確認中に戻す
  const [checked, setChecked] = useState<{
    userId: string;
    onboarded: boolean;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void checkOnboarded().then((onboarded) => {
      if (active) setChecked({ userId, onboarded });
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const refreshOnboarded = useCallback(async () => {
    if (!userId) return;
    setChecked({ userId, onboarded: await checkOnboarded() });
  }, [userId]);

  const onboarded =
    userId && checked?.userId === userId ? checked.onboarded : null;

  const signOut = useCallback(async () => {
    await authClient.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        initialized: !isPending,
        user,
        onboarded,
        refreshOnboarded,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** 冒頭文で好みを伝え終えたか。確認できなければ false（冒頭文の画面に進んでも害はない） */
async function checkOnboarded(): Promise<boolean> {
  try {
    return canFinish(await fetchOwnChoices());
  } catch {
    return false;
  }
}

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider の内側で使ってください");
  return auth;
}

/** ログイン後の画面用。ログインしていなければ例外（ルートの Protected で守っている前提） */
export function useSignedIn(): AuthState & { user: SessionUser } {
  const auth = useAuth();
  if (!auth.user) throw new Error("ログインが必要です");
  return { ...auth, user: auth.user };
}
