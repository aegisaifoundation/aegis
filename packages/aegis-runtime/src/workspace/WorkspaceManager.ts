import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WorkspaceManager {
  private workspacePath: string = '';

  constructor() {
    this.initialize();
  }

  private getRepositoryRoot(startDir: string): string {
    let current = path.resolve(startDir);
    const seen = new Set<string>();

    while (true) {
      const aegisCorePackage = path.join(current, 'aegis-core', 'package.json');
      const runtimePackage = path.join(current, 'packages', 'aegis-runtime', 'package.json');
      if (fs.existsSync(aegisCorePackage) && fs.existsSync(runtimePackage)) {
        return current;
      }

      const parent = path.dirname(current);
      if (parent === current || seen.has(parent)) {
        break;
      }
      seen.add(current);
      current = parent;
    }

    const cwd = process.cwd();
    const nodeModulesIndex = cwd.indexOf('node_modules');
    const sanitizedCwd = nodeModulesIndex === -1 ? cwd : cwd.substring(0, nodeModulesIndex);
    if (fs.existsSync(path.resolve(sanitizedCwd, 'aegis-core/package.json'))) {
      return sanitizedCwd;
    }
    return sanitizedCwd;
  }

  private getAegisCoreRoot(): string {
    const repositoryRoot = this.getRepositoryRoot(__dirname);
    return path.resolve(repositoryRoot, 'aegis-core');
  }

  public initialize(): void {
    const repositoryRoot = this.getRepositoryRoot(__dirname);
    const coreRoot = this.getAegisCoreRoot();
    const configPath = path.resolve(coreRoot, 'src/config/runtime.json');
    const workspaceRootOverride = process.env.AEGIS_WORKSPACE_ROOT;

    let workspaceRootConfig = '../workspace/shared';

    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.workspaceRoot) {
          workspaceRootConfig = config.workspaceRoot;
        }
      }
    } catch (e) {
      console.warn('WorkspaceManager: Failed to read runtime.json, using default path.', e);
    }

    if (workspaceRootOverride) {
      this.workspacePath = path.normalize(path.resolve(workspaceRootOverride));
    } else if (path.isAbsolute(workspaceRootConfig)) {
      this.workspacePath = path.normalize(workspaceRootConfig);
    } else {
      this.workspacePath = path.resolve(coreRoot, workspaceRootConfig);
    }

    const workspaceDir = path.dirname(this.workspacePath);
    const directoriesToCreate = [
      this.workspacePath,
      path.resolve(workspaceDir, 'sessions'),
      path.resolve(workspaceDir, 'reports'),
      path.resolve(workspaceDir, 'generated'),
      path.resolve(workspaceDir, 'uploads'),
      path.resolve(workspaceDir, 'temporary'),
      path.resolve(workspaceDir, 'memory'),
    ];

    for (const dir of directoriesToCreate) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    const expectedMemoryRoot = path.resolve(repositoryRoot, 'workspace', 'memory');
    const expectedSessionsRoot = path.resolve(repositoryRoot, 'workspace', 'memory', 'sessions');
    const expectedTrashRoot = path.resolve(repositoryRoot, 'workspace', 'memory', 'trash');

    fs.mkdirSync(expectedMemoryRoot, { recursive: true });
    fs.mkdirSync(expectedSessionsRoot, { recursive: true });
    fs.mkdirSync(expectedTrashRoot, { recursive: true });
  }

  public getWorkspacePath(): string {
    if (!this.workspacePath) {
      this.initialize();
    }
    return this.workspacePath;
  }
}

export const workspaceManager = new WorkspaceManager();
