export { profileProject } from "./profiler";
export type {
  ProjectProfile,
  FrameworkInfo,
  FrameworkName,
  ProjectContext,
  FileInventory,
} from "./profiler";

export { runSecurityStation } from "./stations/security";
export type { CheckResult as LegacyCheckResult, StationResult, Severity as LegacySeverity } from "./stations/types";

export { buildCodeProfile } from "./checks/profile";
export { generateAgentsMd } from "./agents-md";
export { buildFingerprint, detectPlatform, inferModel, computeAiRatio } from "./fingerprint";
export type { Platform, PlatformDetection, ModelInference, AiRatio, Fingerprint } from "./fingerprint/types";
export { buildRemediationPlan, parseMinutes } from "./remediation";
export type { RemediationItem, RemediationPlan, AutoFixClass } from "./remediation";
export { runChecks, overallScore } from "./checks/engine";
export type {
  CheckResult,
  StationScore,
  CodeProfile,
  FileInfo,
  GitCommit,
  Station,
  Severity,
  CheckFn,
  Framework,
} from "./checks/types";
