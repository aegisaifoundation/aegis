import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
export class SourceAnalyzer {
    workspaceRoot;
    constructor(workspaceRoot = process.cwd()) {
        this.workspaceRoot = workspaceRoot;
    }
    async discoverPackages() {
        const packagesDir = path.resolve(this.workspaceRoot, 'packages');
        if (!existsSync(packagesDir)) {
            return [];
        }
        const entries = await fs.readdir(packagesDir, { withFileTypes: true });
        const discovered = [];
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const pkgPath = path.join(packagesDir, entry.name);
                const packageJsonPath = path.join(pkgPath, 'package.json');
                if (existsSync(packageJsonPath)) {
                    try {
                        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                        // Read engine.json if present, or fallback
                        let engineJson = {};
                        const engineJsonPath = path.join(pkgPath, 'engine.json');
                        if (existsSync(engineJsonPath)) {
                            engineJson = JSON.parse(await fs.readFile(engineJsonPath, 'utf8'));
                        }
                        discovered.push({
                            id: engineJson.id || packageJson.name.replace('@aegis/', 'aegis-'),
                            name: packageJson.name,
                            version: packageJson.version || '1.0.0',
                            directory: pkgPath,
                            dependencies: engineJson.dependencies || Object.keys(packageJson.dependencies || {}).filter(k => k.startsWith('@aegis/')),
                            capabilities: engineJson.capabilities || [],
                            permissions: engineJson.permissions || []
                        });
                    }
                    catch { }
                }
            }
        }
        return discovered;
    }
    getBuildOrder(packages) {
        const visited = new Set();
        const temp = new Set();
        const order = [];
        const map = new Map(packages.map(p => [p.name, p]));
        const idMap = new Map(packages.map(p => [p.id, p]));
        const visit = (pkg) => {
            if (temp.has(pkg.name)) {
                throw new Error(`Circular dependency detected involving package: ${pkg.name}`);
            }
            if (!visited.has(pkg.name)) {
                temp.add(pkg.name);
                for (const dep of pkg.dependencies) {
                    const resolved = map.get(dep) || idMap.get(dep);
                    if (resolved) {
                        visit(resolved);
                    }
                }
                temp.delete(pkg.name);
                visited.add(pkg.name);
                order.push(pkg);
            }
        };
        for (const pkg of packages) {
            visit(pkg);
        }
        return order;
    }
}
