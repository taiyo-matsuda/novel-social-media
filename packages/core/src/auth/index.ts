import { z } from "zod";

/** メールに届くワンタイムコードの桁数（Supabase の既定は6桁） */
export const OTP_LENGTH = 6;

const emailSchema = z.email();

/** 入力されたメールアドレスを、前後の空白を除いて小文字にそろえる。 */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(input: string): boolean {
  return emailSchema.safeParse(normalizeEmail(input)).success;
}

/** 入力されたコードから数字以外（空白・ハイフン・全角数字の変換漏れなど）を取り除く。 */
export function normalizeOtp(input: string): string {
  return input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, "");
}

export function isValidOtp(input: string): boolean {
  return normalizeOtp(input).length === OTP_LENGTH;
}
