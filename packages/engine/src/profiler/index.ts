import { detectFramework, readPackageJson } from "./detect-framework";
import { detectContext, buildFileInventory } from "./detect-context";
import type { ProjectProfile } from "./types";

export type { ProjectProfile, FrameworkInfo, FrameworkName, ProjectContext, FileInventory } from "./types";

export async function profileProject(root: string): Promise<ProjectProfile> {
  const [framework, pkg] = await Promise.all([
    detectFramework(root),
    readPackageJson(root),
  ]);
  const [context, files] = await Promise.all([
    detectContext(root, pkg),
    buildFileInventory(root),
  ]);

  return { root, framework, context, files };
}

export { detectFramework, readPackageJson } from "./detect-framework";
export { detectContext, buildFileInventory } from "./detect-context";
