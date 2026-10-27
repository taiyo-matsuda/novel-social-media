// パスワードのハッシュ化。Better Auth 標準の scrypt は Workers の無料枠のCPU時間（10ms）を超えるため、
// Workers が標準で持つ Web Crypto の PBKDF2 を使う（Workers の上限が10万回なのでその回数にする）

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

/** 保存形式：pbkdf2$回数$ソルト$ハッシュ（回数を持つので、あとで回数を変えても古いものを検証できる） */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const [scheme, iterations, salt, expected] = hash.split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !expected) return false;
  const actual = await derive(password, fromBase64(salt), Number(iterations));
  const want = fromBase64(expected);
  if (actual.length !== want.length) return false;
  // 比較にかかる時間から一致した長さを推測されないよう、最後まで比べる
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ want[i];
  return diff === 0;
}
