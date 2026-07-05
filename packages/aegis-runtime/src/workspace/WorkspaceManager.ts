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

  private getAegisCoreRoot(): string {
    let current = __dirname;
    while (true) {
      const corePath = path.join(current, 'aegis-core');
      const packageJson = path.join(corePath, 'package.json');
      if (fs.existsSync(packageJson)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
          if (pkg.name === 'aegis-core') {
            return corePath;
          }
        } catch (e) {}
      }
      const selfPackageJson = path.join(current, 'package.json');
      if (fs.existsSync(selfPackageJson)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(selfPackageJson, 'utf8'));
          if (pkg.name === 'aegis-core') {
            return current;
          }
        } catch (e) {}
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
    if (fs.existsSync(path.resolve(process.cwd(), 'aegis-core/package.json'))) {
      return path.resolve(process.cwd(), 'aegis-core');
    }
    return process.cwd();
  }

  public initialize(): void {
    const coreRoot = this.getAegisCoreRoot();
    const configPath = path.resolve(coreRoot, 'src/config/runtime.json');
    let workspaceRootConfig = '../workspace/shared'; // default fallback

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

    if (path.isAbsolute(workspaceRootConfig)) {
      this.workspacePath = path.normalize(workspaceRootConfig);
    } else {
      this.workspacePath = path.resolve(coreRoot, workspaceRootConfig);
    }

    const workspaceDir = path.dirname(this.workspacePath);

    const directoriesToCreate = [
      this.workspacePath, // shared/
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
  }

  public getWorkspacePath(): string {
    if (!this.workspacePath) {
      this.initialize();
    }
    return this.workspacePath;
  }
}

export const workspaceManager = new WorkspaceManager();
