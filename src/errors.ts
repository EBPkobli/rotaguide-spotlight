import type { GuideIssue } from "./types";

export class GuideParseError extends Error {
  readonly issues: GuideIssue[];

  constructor(issues: GuideIssue[], message = "Guide content is invalid") {
    super(message);
    this.name = "GuideParseError";
    this.issues = issues;
  }
}

export function formatGuideIssues(issues: GuideIssue[]): string {
  return issues
    .map((issue, index) => {
      const line = typeof issue.line === "number" ? `line ${issue.line}` : "unknown line";
      return `${index + 1}. [${issue.code}] ${line}: ${issue.message}${
        issue.hint ? ` (${issue.hint})` : ""
      }`;
    })
    .join("\n");
}
