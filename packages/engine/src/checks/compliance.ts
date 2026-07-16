import type { CheckFn } from "./types";

function stub(id: string, weight: number, sev: "critical" | "warning" | "info", title: string, failMessage: string, fixPrompt: string, diff: "copy-paste" | "moderate" | "architectural", time: string, safety: "safe" | "review" | "human-only"): CheckFn {
  return () => ({ id, station: "compliance" as const, passed: true, severity: sev, confidence: 0, title, failMessage, evidence: "", fixPrompt, fixDifficulty: diff, fixTime: time, autoFixSafety: safety, scoreWeight: weight });
}

export const complianceChecks: CheckFn[] = [
  stub("COMP-001", 22, "critical", "Privacy policy present",             "No privacy policy page found.",                                       "Add /privacy route. If you collect any user data, a privacy policy is legally required in most jurisdictions.", "copy-paste", "1 hr",  "review"),
  stub("COMP-002", 18, "critical", "Terms of service present",           "No terms of service page found.",                                     "Add /terms route. Required before accepting payment or user-generated content.",                              "copy-paste", "1 hr",  "review"),
  stub("COMP-003", 16, "warning",  "Cookie consent banner",              "No cookie consent mechanism detected.",                               "Add a consent banner for non-essential cookies. Use a library like react-cookie-consent.",                     "moderate",   "1 hr",  "review"),
  stub("COMP-004", 14, "warning",  "Account deletion endpoint",          "No account deletion route found.",                                    "Add DELETE /api/user/account that removes all user data. Required by GDPR/CCPA.",                              "moderate",   "2 hrs", "review"),
  stub("COMP-005", 12, "warning",  "No PII logged",                      "Emails, names, or other PII appear in console/logger output.",        "Redact PII from all log statements. Log user IDs only, never email or name.",                                 "moderate",   "1 hr",  "review"),
  stub("COMP-006",  8, "warning",  "Data retention policy",              "No data retention or cleanup jobs found.",                            "Define and implement a data retention policy. Auto-delete inactive data after N days.",                        "architectural","2 hrs","review"),
  stub("COMP-007",  6, "info",     "Cookie HttpOnly + Secure flags",     "Auth cookies missing security flags.",                                "Set auth cookies with HttpOnly; Secure; SameSite=Strict to prevent XSS access.",                              "copy-paste", "5 min", "safe"),
  stub("COMP-008",  4, "info",     "Third-party data sharing disclosure","Privacy policy doesn't mention third-party services.",                "List all third-party services that receive user data (analytics, support, payments) in your privacy policy.",   "copy-paste", "30 min","review"),
];
