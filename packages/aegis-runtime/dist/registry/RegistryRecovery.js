import fs from 'fs';
import path from 'path';
export class RegistryRecovery {
    static recoverRegistry(registryPath, workspacePath) {
        const historyDir = path.join(workspacePath, 'registry', 'history');
        if (!fs.existsSync(historyDir)) {
            return null;
        }
        try {
            const files = fs.readdirSync(historyDir)
                .filter(f => f.startsWith('engines_') && f.endsWith('.json'))
                .map(f => {
                const filePath = path.join(historyDir, f);
                return {
                    name: f,
                    filePath,
                    mtime: fs.statSync(filePath).mtimeMs
                };
            })
                .sort((a, b) => b.mtime - a.mtime);
            for (const file of files) {
                try {
                    const content = fs.readFileSync(file.filePath, 'utf8');
                    const parsed = JSON.parse(content);
                    if (parsed && Array.isArray(parsed.engines) && parsed.version) {
                        // Restore file to engines.json
                        const registryDir = path.dirname(registryPath);
                        if (!fs.existsSync(registryDir)) {
                            fs.mkdirSync(registryDir, { recursive: true });
                        }
                        fs.writeFileSync(registryPath, content, 'utf8');
                        console.warn(`[RegistryRecovery] Successfully restored corrupted registry from snapshot: ${file.name}`);
                        return parsed;
                    }
                }
                catch { }
            }
        }
        catch (e) {
            console.error('[RegistryRecovery] Failed to read snapshots:', e.message || e);
        }
        return null;
    }
}
