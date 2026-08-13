/**
 * Client-safe barrel: pure stack detection, constraint catalog, and prompt
 * scoring only. No Anthropic SDK import anywhere in this module's graph —
 * safe to import from "use client" components without bundling the API client.
 */
export {
  detectStack,
  firstKeywordHit,
  STACK_DEFS,
  CONSTRAINT_CATALOG,
  getApplicableConstraints,
  renderConstraintBlock,
  uniqueCheckIds,
} from "./stack";
export type {
  StackKey,
  StackDef,
  FocusMode,
  ConstraintCategory,
  Constraint,
  ConstraintSelection,
} from "./stack";

export { scorePrompt, isConstraintMentioned } from "./prompt-score";
export type { PromptScore } from "./prompt-score";
