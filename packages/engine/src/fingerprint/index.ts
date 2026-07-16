import type { CodeProfile } from "../checks/types";
import { detectPlatform } from "./platform";
import { inferModel } from "./model";
import { computeAiRatio } from "./ratio";
import type { Fingerprint } from "./types";

export { detectPlatform } from "./platform";
export { inferModel } from "./model";
export { computeAiRatio } from "./ratio";
export type { Platform, PlatformDetection, ModelInference, AiRatio, Fingerprint } from "./types";

export function buildFingerprint(profile: CodeProfile): Fingerprint {
  const platform = detectPlatform(profile);
  const model = inferModel(platform);
  const aiRatio = computeAiRatio(profile.gitCommits);
  return { platform, model, aiRatio };
}
