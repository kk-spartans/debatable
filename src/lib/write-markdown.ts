import type { DebateResult } from "./debate.ts";

export function writeMarkdown(result: DebateResult, outputPath?: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const dateStr = `${y}-${mo}-${d}`;
  const timeStr = `${h}:${mi}:${s}`;

  const path = outputPath ?? `debatable-${y}-${mo}-${d}-${h}${mi}${s}.md`;

  const lines: string[] = [];
  lines.push(`# Debate: "${result.topic}"`);
  lines.push("");
  lines.push(`**Date:** ${dateStr}`);
  lines.push(`**Time:** ${timeStr}`);
  lines.push(`**Rounds:** ${result.rounds}`);
  lines.push("");

  const max = Math.max(result.proRounds.length, result.conRounds.length);
  for (let i = 0; i < max; i++) {
    lines.push(`## Round ${i + 1}`);
    lines.push("");
    const pro = result.proRounds[i];
    if (pro) {
      lines.push("### PRO (For)");
      lines.push("");
      lines.push(pro);
      lines.push("");
    }
    const con = result.conRounds[i];
    if (con) {
      lines.push("### NEG (Against)");
      lines.push("");
      lines.push(con);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  lines.push("## Constructive Feedback");
  lines.push("");
  if (result.proFeedback) {
    lines.push("### PRO's feedback to NEG");
    lines.push("");
    lines.push(result.proFeedback);
    lines.push("");
  }
  if (result.conFeedback) {
    lines.push("### NEG's feedback to PRO");
    lines.push("");
    lines.push(result.conFeedback);
    lines.push("");
  }

  lines.push("## Judge Decision");
  lines.push("");
  lines.push(`**Winner:** ${result.judgeResult.winner}`);
  lines.push("");
  lines.push(result.judgeResult.reasoning);
  lines.push("");

  const content = lines.join("\n");
  void Bun.write(path, content);
  return path;
}
