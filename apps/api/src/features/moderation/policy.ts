import type { ReportReason } from "@novel/core/api";

// 無断転載などへの対応の決まり（docs/decisions/0007-copyright-infringement.md）

/** 権利侵害の通報がこの件数たまったら、運営の確認まで仮で隠す */
export const RIGHTS_REPORTS_TO_HIDE = 1;
/** 理由を問わず、通報がこの件数たまったら仮で隠す（同じ人の通報は1件と数える） */
export const REPORTS_TO_HIDE = 3;
/** 取り下げがこの回数になったらアカウントを止める */
export const STRIKES_TO_SUSPEND = 3;

/** 作品への未対応の通報の数 */
export type OpenReportCounts = { rights: number; total: number };

/** 未対応の通報の数から、確認の前に仮で隠すかを決める */
export function shouldAutoHide(counts: OpenReportCounts): boolean {
  return (
    counts.rights >= RIGHTS_REPORTS_TO_HIDE || counts.total >= REPORTS_TO_HIDE
  );
}

/** 取り下げの回数から、アカウントを止めるかを決める */
export function shouldSuspend(strikes: number): boolean {
  return strikes >= STRIKES_TO_SUSPEND;
}

const REASON_LABELS: Record<ReportReason, string> = {
  sexual: "性的な内容",
  violence: "暴力的な内容",
  harassment: "誹謗中傷",
  spam: "スパム",
  rights: "権利侵害",
  other: "その他",
};

/** 運営への通知の文面。通報した人・申し立てた人の名前や連絡先は載せない（管理画面で見る） */
export type OpsEvent =
  | {
      kind: "report";
      workId: string;
      title: string;
      reason: ReportReason;
      detail?: string;
      autoHidden: boolean;
    }
  | { kind: "appeal"; workId: string; title: string }
  | { kind: "rights_claim"; target: string }
  | { kind: "suspended"; userId: string; strikes: number };

/** 運営への通知（Slack など）の本文を作る。[adminUrl] は管理画面の URL */
export function opsMessage(event: OpsEvent, adminUrl: string): string {
  const lines: string[] = [];
  switch (event.kind) {
    case "report": {
      const mark = event.reason === "rights" ? "【権利侵害】" : "";
      lines.push(
        `${mark}通報：『${event.title}』（理由：${REASON_LABELS[event.reason]}）`,
      );
      if (event.detail) lines.push(`補足：${truncate(event.detail, 200)}`);
      if (event.autoHidden) lines.push("→ 確認まで自動で非表示にしました");
      lines.push(`作品ID：${event.workId}`);
      break;
    }
    case "appeal":
      lines.push(`異議：『${event.title}』の作者から異議が届きました`);
      lines.push(`作品ID：${event.workId}`);
      break;
    case "rights_claim":
      lines.push("【権利侵害】Web から申し立てが届きました");
      lines.push(`対象：${truncate(event.target, 200)}`);
      break;
    case "suspended":
      lines.push(
        `アカウント停止：取り下げが${event.strikes}回になったので停止しました`,
      );
      lines.push(`利用者ID：${event.userId}`);
      break;
  }
  lines.push(`管理画面：${adminUrl}`);
  return lines.join("\n");
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
