import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class WorkspaceManager {
    workspacePath = '';
    constructor() {
        this.initialize();
    }
    /**
     * Finds the root of the aegis-core project by searching upwards for package.json
     */
    getAegisCoreRoot() {
        let current = __dirname;
        while (true) {
            const packageJson = path.join(current, 'package.json');
            if (fs.existsSync(packageJson)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                    if (pkg.name === 'aegis-core') {
                        return current;
                    }
                }
                catch (e) {
                    // ignore parsing issues
                }
            }
            const parent = path.dirname(current);
            if (parent === current) {
                break;
            }
            current = parent;
        }
        // Fallback to process.cwd()
        return process.cwd();
    }
    /**
     * Initializes workspace paths and structure
     */
    initialize() {
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
        }
        catch (e) {
            console.warn('WorkspaceManager: Failed to read runtime.json, using default path.', e);
        }
        // Resolve the absolute path of the workspace root
        if (path.isAbsolute(workspaceRootConfig)) {
            this.workspacePath = path.normalize(workspaceRootConfig);
        }
        else {
            this.workspacePath = path.resolve(coreRoot, workspaceRootConfig);
        }
        // Resolve parent folder to create other directories (sessions, reports, etc.)
        const workspaceDir = path.dirname(this.workspacePath);
        const directoriesToCreate = [
            this.workspacePath, // shared/
            path.resolve(workspaceDir, 'sessions'),
            path.resolve(workspaceDir, 'reports'),
            path.resolve(workspaceDir, 'generated'),
            path.resolve(workspaceDir, 'uploads'),
            path.resolve(workspaceDir, 'temporary'),
        ];
        for (const dir of directoriesToCreate) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }
    /**
     * Gets the primary workspace/shared sandbox path
     */
    getWorkspacePath() {
        if (!this.workspacePath) {
            this.initialize();
        }
        return this.workspacePath;
    }
}
export const workspaceManager = new WorkspaceManager();
