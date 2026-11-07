// サーバーが出す Web のページ（運営の管理画面と、権利者の申し立てフォーム）。
// 外部のファイルは管理画面の Google ログインのスクリプトだけ読む。データは必ず textContent で入れる（HTML として解釈させない）

/** ページに付けるヘッダー。他サイトへの埋め込みとキャッシュを断る */
export const PAGE_HEADERS: Record<string, string> = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};

/** Google ログイン（Google Identity Services）の読み込み元 */
const GSI = "https://accounts.google.com/gsi/";

/** 管理画面のヘッダー。Google ログインのボタンとポップアップだけ外部を許す */
export const ADMIN_PAGE_HEADERS: Record<string, string> = {
  ...PAGE_HEADERS,
  "Content-Security-Policy": `default-src 'none'; script-src 'unsafe-inline' ${GSI}client; style-src 'unsafe-inline' ${GSI}style; frame-src ${GSI}; connect-src 'self' ${GSI}; img-src https://*.googleusercontent.com; form-action 'none'; frame-ancestors 'none'; base-uri 'none'`,
  // Google のボタンは呼び出し元のオリジンを見るので、オリジンだけは送る
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const BASE_STYLE = `
  body { font-family: -apple-system, "Hiragino Sans", sans-serif; max-width: 760px; margin: 0 auto; padding: 16px; line-height: 1.7; color: #222; background: #fafaf7; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1.1rem; margin-top: 1.6em; }
  label { display: block; margin-top: 12px; font-weight: 600; }
  input[type=text], input[type=email], input[type=password], textarea { width: 100%; box-sizing: border-box; padding: 8px; font: inherit; border: 1px solid #bbb; border-radius: 6px; background: #fff; }
  textarea { min-height: 6em; }
  button { font: inherit; padding: 6px 14px; border-radius: 6px; border: 1px solid #888; background: #fff; cursor: pointer; margin: 4px 4px 4px 0; }
  button.primary { background: #333; color: #fff; border-color: #333; }
  .muted { color: #666; font-size: .9rem; }
  .card { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin: 8px 0; }
  .hp { position: absolute; left: -9999px; }
`;

/** 権利者の申し立てフォーム（GET /rights）。ログイン不要 */
export const RIGHTS_PAGE = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>権利侵害の申し立て｜Ballad</title><style>${BASE_STYLE}</style></head>
<body>
<h1>権利侵害の申し立て</h1>
<p>Ballad に公開されている作品が、あなたの作品を無断で使っている場合は、このフォームからお知らせください。運営が確認し、権利の侵害と判断した作品は取り下げます。</p>
<p class="muted">アイデア・設定・よくある展開が似ているだけのものは対象外です。文章や具体的な表現が使われている場合に申し立ててください。いただいた連絡先は、運営からの連絡にだけ使い、作品の作者には伝えません。</p>
<form id="f">
  <label for="name">お名前（権利者または代理人）</label><input id="name" type="text" maxlength="100" required>
  <label for="email">連絡先のメールアドレス</label><input id="email" type="email" maxlength="254" required>
  <label for="target">対象の Ballad の作品（作品名・作者名など）</label><textarea id="target" maxlength="500" required></textarea>
  <label for="original">あなたの作品（作品名・掲載先の URL など）</label><textarea id="original" maxlength="500" required></textarea>
  <label for="detail">補足（どの部分が使われているかなど・任意）</label><textarea id="detail" maxlength="2000"></textarea>
  <input id="website" class="hp" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
  <label><input id="agreed" type="checkbox" required> 私は権利者本人またはその代理人であり、この内容は正しいです</label>
  <p><button class="primary" type="submit">送信する</button></p>
  <p id="msg" role="status"></p>
</form>
<script>
const $ = (id) => document.getElementById(id);
$("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("msg").textContent = "送信しています…";
  const body = {
    name: $("name").value, email: $("email").value, target: $("target").value,
    original: $("original").value, detail: $("detail").value || undefined,
    agreed: $("agreed").checked, website: $("website").value,
  };
  try {
    const res = await fetch("/api/rights-claims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { $("f").reset(); $("msg").textContent = "受け付けました。運営が確認し、必要に応じてメールでご連絡します。"; }
    else { $("msg").textContent = "送信できませんでした。入力内容を確かめてください。"; }
  } catch { $("msg").textContent = "送信できませんでした。時間をおいてもう一度お試しください。"; }
});
</script>
</body></html>`;

/**
 * 運営の管理画面（GET /admin）。運営アカウント（メールアドレス＋パスワード）でログインし、
 * データは /admin/api/* から読む。ログインはクッキー（HttpOnly）で持ち、ページの JavaScript からは触れない
 */
/** クライアントIDに使える文字だけにする（ページに埋め込むので） */
function safeClientId(id: string): string {
  return id.replace(/[^A-Za-z0-9.\-_]/g, "");
}

/**
 * 運営の管理画面。webClientId は Google ログインの Web のクライアントID。
 * Google のボタンで受け取った ID トークンを /api/auth/sign-in/social に送ってログインする（アプリと同じ方式）
 */
export const adminPage = (webClientId: string) => `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>運営の管理画面｜Ballad</title><style>${BASE_STYLE}</style></head>
<body>
<h1>運営の管理画面</h1>
<div id="login" class="card" hidden>
  <p>運営の Google アカウントでログインしてください。</p>
  <div id="g_id_onload" data-client_id="${safeClientId(webClientId)}" data-callback="onGoogle" data-auto_prompt="false"></div>
  <div class="g_id_signin" data-type="standard" data-text="signin_with" data-locale="ja"></div>
  <p class="muted">初めてなら、ログインすると利用者IDが出ます。そのアカウントを運営の役割にすると入れるようになります。</p>
</div>
<div id="denied" class="card" hidden>
  <p>このアカウントには管理画面の権限がありません。</p>
  <p>利用者ID：<code id="myId"></code></p>
  <p class="muted">運営のアカウントなら、サーバー側でこの利用者IDの役割を admin にしてから、読み直してください。</p>
  <p><button id="deniedLogout">ログアウト</button></p>
</div>
<div id="main" hidden>
  <p><button id="reload">読み直す</button><button id="logout">ログアウト</button></p>
  <h2>確認が必要な作品</h2><div id="queue"></div>
  <h2>権利者からの申し立て（Web）</h2><div id="claims"></div>
  <h2 id="detailTitle" hidden>作品の中身</h2><div id="detail"></div>
</div>
<p id="msg" role="status"></p>
<script>
const $ = (id) => document.getElementById(id);
const LABELS = { sexual: "性的", violence: "暴力", harassment: "誹謗中傷", spam: "スパム", rights: "権利侵害", other: "その他" };
const MOD = { ok: "問題なし", hidden: "仮で非表示", removed: "取り下げ済み" };

function el(tag, text, cls) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; }
function button(text, onClick, cls) { const b = el("button", text, cls); b.addEventListener("click", onClick); return b; }

function show(id) { for (const s of ["login", "denied", "main"]) $(s).hidden = s !== id; }

async function api(method, path, body) {
  const res = await fetch("/admin/api" + path, {
    method, headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { show("login"); throw new Error("ログインしてください"); }
  if (res.status === 403) {
    const j = await res.json().catch(() => ({}));
    if (j.userId) { $("myId").textContent = j.userId; show("denied"); }
    throw new Error(j.error || "許可されていません");
  }
  if (!res.ok) throw new Error("失敗しました（" + res.status + "）");
  return res.status === 204 ? null : res.json();
}

// Google のボタンから呼ばれる。受け取った ID トークンでログインする
async function onGoogle(response) {
  $("msg").textContent = "";
  const res = await fetch("/api/auth/sign-in/social", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "google", idToken: { token: response.credential } }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    $("msg").textContent = j.message || "ログインできませんでした";
    return;
  }
  load();
}

async function logout() { await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); show("login"); }

async function load() {
  $("msg").textContent = "";
  try {
    const [{ items }, { claims }] = await Promise.all([api("GET", "/queue"), api("GET", "/rights-claims")]);
    show("main");
    const q = $("queue"); q.replaceChildren();
    if (items.length === 0) q.append(el("p", "ありません", "muted"));
    for (const it of items) {
      const c = el("div", undefined, "card");
      c.append(el("strong", "『" + it.title + "』"), el("div", "作者：" + it.authorName + "（" + it.authorId + "）", "muted"));
      c.append(el("div", MOD[it.moderation] + "／未対応の通報 " + it.openReports + " 件（権利侵害 " + it.rightsReports + " 件）／異議 " + it.openAppeals + " 件"));
      c.append(button("中身を見る", () => showWork(it.workId)));
      q.append(c);
    }
    const cl = $("claims"); cl.replaceChildren();
    if (claims.length === 0) cl.append(el("p", "ありません", "muted"));
    for (const it of claims) {
      const c = el("div", undefined, "card");
      c.append(el("strong", (it.status === "open" ? "【未対応】" : "【対応済み】") + it.claimantName + "（" + it.claimantEmail + "）"));
      c.append(el("div", "対象：" + it.target), el("div", "元の作品：" + it.original));
      if (it.detail) c.append(el("div", "補足：" + it.detail));
      c.append(el("div", it.createdAt + (it.workId ? "／作品ID：" + it.workId : ""), "muted"));
      const input = el("input"); input.type = "text"; input.placeholder = "結びつける作品ID"; input.value = it.workId || "";
      c.append(input);
      c.append(button("作品IDを保存", () => act(() => api("PATCH", "/rights-claims/" + it.id, { workId: input.value.trim() || null }))));
      if (input.value) c.append(button("作品を見る", () => showWork(input.value.trim())));
      c.append(button(it.status === "open" ? "対応済みにする" : "未対応に戻す", () => act(() => api("PATCH", "/rights-claims/" + it.id, { resolved: it.status === "open" }))));
      cl.append(c);
    }
  } catch (e) { $("msg").textContent = e.message; }
}

// fn が返した文面は、一覧を読み直した後に出す
async function act(fn) { try { const note = await fn(); await load(); if (note) $("msg").textContent = note; } catch (e) { $("msg").textContent = e.message; } }

async function showWork(workId) {
  try {
    const { work } = await api("GET", "/works/" + encodeURIComponent(workId));
    const d = $("detail"); d.replaceChildren(); $("detailTitle").hidden = false;
    d.append(el("h3", "『" + work.title + "』"));
    d.append(el("div", "作者：" + work.authorName + "（" + work.authorId + "）／取り下げ " + work.strikes + " 回" + (work.suspended ? "／停止中" : ""), "muted"));
    d.append(el("div", "公開：" + (work.status === "published" ? "公開中" : "下書き") + "／運営の判断：" + MOD[work.moderation]));
    const run = (action) => act(async () => { const r = await api("POST", "/works/" + work.id + "/actions", { action }); await showWork(work.id); return "作者の取り下げ " + r.strikes + " 回" + (r.suspended ? "。アカウントを停止しました" : ""); });
    d.append(button("問題なしに戻す", () => run("restore")));
    d.append(button("仮で非表示にする", () => run("hide")));
    d.append(button("取り下げる（違反1回）", () => { if (confirm("取り下げて、作者の違反を1回数えます。よろしいですか？")) run("remove"); }, "primary"));
    if (work.suspended) d.append(button("停止を解く", () => act(async () => { await api("DELETE", "/suspensions/" + work.authorId); await showWork(work.id); return "停止を解きました"; })));
    d.append(el("h3", "通報"));
    for (const r of work.reports) d.append(el("div", (r.status === "open" ? "【未対応】" : "【対応済み】") + LABELS[r.reason] + (r.detail ? "：" + r.detail : "") + "（" + r.createdAt + "）"));
    d.append(el("h3", "作者の異議"));
    for (const a of work.appeals) d.append(el("div", (a.status === "open" ? "【未対応】" : "【対応済み】") + a.body + "（" + a.createdAt + "）"));
    d.append(el("h3", "本文"));
    for (const ch of work.chapters) {
      const c = el("div", undefined, "card");
      c.append(el("strong", "第" + ch.position + "章 " + ch.title), el("div", "展開リクエスト：" + (ch.plotRequest || "なし") + "／生成：" + ch.createdAt, "muted"));
      const b = el("div", ch.body); b.style.whiteSpace = "pre-wrap"; c.append(b);
      d.append(c);
    }
    d.scrollIntoView();
  } catch (e) { $("msg").textContent = e.message; }
}

$("reload").addEventListener("click", load);
$("logout").addEventListener("click", logout);
$("deniedLogout").addEventListener("click", logout);
load();
</script>
<script src="${GSI}client" async></script>
</body></html>`;
