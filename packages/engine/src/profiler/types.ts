export interface ProjectProfile {
  root: string;
  framework: FrameworkInfo;
  context: ProjectContext;
  files: FileInventory;
}

export interface FrameworkInfo {
  name: FrameworkName;
  version: string | null;
  confidence: number;
  signals: string[];
}

export type FrameworkName =
  | "nextjs"
  | "remix"
  | "vite"
  | "cra"
  | "astro"
  | "nuxt"
  | "sveltekit"
  | "angular"
  | "gatsby"
  | "express"
  | "unknown";

export interface ProjectContext {
  hasAuth: boolean;
  hasDatabase: boolean;
  hasAPI: boolean;
  hasTests: boolean;
  hasCICD: boolean;
  hasDocker: boolean;
  hasEnvFile: boolean;
  hasTypeScript: boolean;
  hasLinting: boolean;
  hasMonorepo: boolean;
  packageManager: "npm" | "yarn" | "pnpm" | "bun" | "unknown";
}

export interface FileInventory {
  totalFiles: number;
  sourceFiles: string[];
  configFiles: string[];
  envFiles: string[];
}
