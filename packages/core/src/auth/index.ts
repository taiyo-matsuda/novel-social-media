import { z } from "zod";

/** パスワードの最短の長さ（サーバーの Better Auth の設定にも使う） */
export const MIN_PASSWORD_LENGTH = 8;
/** パスワードの最長の長さ（Better Auth の既定と同じ） */
export const MAX_PASSWORD_LENGTH = 128;

const emailSchema = z.email();

/** 入力されたメールアドレスを、前後の空白を除いて小文字にそろえる。 */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(input: string): boolean {
  return emailSchema.safeParse(normalizeEmail(input)).success;
}

export function isValidPassword(input: string): boolean {
  return (
    input.length >= MIN_PASSWORD_LENGTH && input.length <= MAX_PASSWORD_LENGTH
  );
}

/** Better Auth のエラーを、画面に出す日本語にする。 */
export function authErrorMessage(error: {
  code?: string;
  status?: number;
}): string {
  if (error.status === 429)
    return "試行が続いたため、少し時間をおいてからお試しください。";
  if (error.code?.startsWith("USER_ALREADY_EXISTS"))
    return "このメールアドレスはすでに登録されています。「ログイン」から入ってください。";
  if (error.code === "INVALID_EMAIL_OR_PASSWORD")
    return "メールアドレスかパスワードが違います。";
  if (error.code === "INVALID_EMAIL")
    return "メールアドレスの形式が正しくありません。";
  if (error.code === "PASSWORD_TOO_SHORT")
    return `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください。`;
  return "うまくいきませんでした。通信状態を確かめて、もう一度お試しください。";
}
