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
      const packageJson = path.join(current, 'package.json');
      if (fs.existsSync(packageJson)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
          if (pkg.name === 'aegis-monorepo') {
            return current;
          }
        } catch (e) {}
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
    return sanitizedCwd;
  }

  private getConfigPath(repositoryRoot: string): string {
    if (process.env.AEGIS_CONFIG_PATH) {
      return path.resolve(process.env.AEGIS_CONFIG_PATH);
    }
    const productionConfig = path.resolve(repositoryRoot, 'config/runtime.json');
    if (fs.existsSync(productionConfig)) {
      return productionConfig;
    }
    const legacyConfig = path.resolve(repositoryRoot, 'aegis-core/src/config/runtime.json');
    if (fs.existsSync(legacyConfig)) {
      return legacyConfig;
    }
    return productionConfig;
  }

  public initialize(): void {
    const repositoryRoot = this.getRepositoryRoot(__dirname);
    const configPath = this.getConfigPath(repositoryRoot);
    const workspaceRootOverride = process.env.AEGIS_WORKSPACE_ROOT;

    let workspaceRootConfig = './workspace';

    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.workspace) {
          workspaceRootConfig = config.workspace;
        } else if (config.workspaceRoot) {
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
      if (workspaceRootConfig.startsWith('../workspace')) {
        this.workspacePath = path.resolve(repositoryRoot, workspaceRootConfig.replace('../workspace', './workspace'));
      } else {
        this.workspacePath = path.resolve(repositoryRoot, workspaceRootConfig);
      }
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

    const expectedMemoryRoot = path.resolve(this.workspacePath, 'memory');
    const expectedSessionsRoot = path.resolve(this.workspacePath, 'memory', 'sessions');
    const expectedTrashRoot = path.resolve(this.workspacePath, 'memory', 'trash');

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
