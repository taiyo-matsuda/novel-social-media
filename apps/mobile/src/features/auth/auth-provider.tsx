import { canFinish } from "@novel/core/openings";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { fetchOwnChoices } from "@/features/openings/openings-repo";
import { getSupabase } from "@/lib/supabase";

type AuthState = {
  /** 接続先が未設定なら null */
  db: SupabaseClient | null;
  /** 起動時にログイン状態を読み込み終えたか */
  initialized: boolean;
  session: Session | null;
  /** 冒頭文で好みを伝え終えたか。確認中は null */
  onboarded: boolean | null;
  /** 冒頭文を選び終えたあとに呼び、onboarded を取り直す */
  refreshOnboarded: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [db] = useState(getSupabase);
  const [initialized, setInitialized] = useState(db === null);
  const [session, setSession] = useState<Session | null>(null);
  // どの利用者について確認した結果かも持ち、ログインし直したら確認中に戻す
  const [checked, setChecked] = useState<{
    userId: string;
    onboarded: boolean;
  } | null>(null);

  useEffect(() => {
    if (!db) return;
    db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitialized(true);
    });
    const { data } = db.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, [db]);

  const userId = session?.user.id;

  useEffect(() => {
    if (!db || !userId) return;
    let active = true;
    void checkOnboarded(db, userId).then((onboarded) => {
      if (active) setChecked({ userId, onboarded });
    });
    return () => {
      active = false;
    };
  }, [db, userId]);

  const refreshOnboarded = useCallback(async () => {
    if (!db || !userId) return;
    setChecked({ userId, onboarded: await checkOnboarded(db, userId) });
  }, [db, userId]);

  const onboarded =
    userId && checked?.userId === userId ? checked.onboarded : null;

  const signOut = useCallback(async () => {
    await db?.auth.signOut();
  }, [db]);

  return (
    <AuthContext.Provider
      value={{
        db,
        initialized,
        session,
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
async function checkOnboarded(
  db: SupabaseClient,
  userId: string,
): Promise<boolean> {
  try {
    return canFinish(await fetchOwnChoices(db, userId));
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
export function useSignedIn(): {
  db: SupabaseClient;
  userId: string;
} & AuthState {
  const auth = useAuth();
  if (!auth.db || !auth.session) throw new Error("ログインが必要です");
  return { ...auth, db: auth.db, userId: auth.session.user.id };
}
