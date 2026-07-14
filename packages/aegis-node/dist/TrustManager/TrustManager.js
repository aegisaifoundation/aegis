import fs from 'fs';
import path from 'path';
export class TrustManager {
    configManager;
    workspaceRoot;
    trustPath;
    constructor(configManager, workspaceRoot) {
        this.configManager = configManager;
        this.workspaceRoot = workspaceRoot;
        this.trustPath = path.join(this.workspaceRoot, 'trust');
    }
    initialize() {
        if (!fs.existsSync(this.trustPath)) {
            fs.mkdirSync(this.trustPath, { recursive: true });
        }
    }
    addTrustedNode(node) {
        this.initialize();
        const trustedNode = {
            ...node,
            addedAt: new Date().toISOString()
        };
        // Save key files individually for fast filesystem resolution
        const keyFileName = node.nodeId.replace(/[^a-zA-Z0-9]/g, '_') + '.pub';
        fs.writeFileSync(path.join(this.trustPath, keyFileName), node.publicKey, 'utf8');
        if (node.certificate) {
            const certFileName = node.nodeId.replace(/[^a-zA-Z0-9]/g, '_') + '.crt';
            fs.writeFileSync(path.join(this.trustPath, certFileName), node.certificate, 'utf8');
        }
        // Update config trusted list
        const config = this.configManager.get();
        const list = config.trust.trustedNodes || [];
        const index = list.findIndex(n => n.nodeId === node.nodeId);
        const trustEntry = {
            nodeId: node.nodeId,
            publicKey: node.publicKey,
            trustLevel: node.trustLevel,
            alias: node.alias
        };
        if (index !== -1) {
            list[index] = trustEntry;
        }
        else {
            list.push(trustEntry);
        }
        this.configManager.update({
            trust: {
                trustedNodes: list
            }
        });
    }
    removeTrustedNode(nodeId) {
        const config = this.configManager.get();
        const list = config.trust.trustedNodes || [];
        const filtered = list.filter(n => n.nodeId !== nodeId);
        this.configManager.update({
            trust: {
                trustedNodes: filtered
            }
        });
        // Clean files if they exist
        const keyFileName = nodeId.replace(/[^a-zA-Z0-9]/g, '_') + '.pub';
        const certFileName = nodeId.replace(/[^a-zA-Z0-9]/g, '_') + '.crt';
        try {
            const kp = path.join(this.trustPath, keyFileName);
            if (fs.existsSync(kp))
                fs.unlinkSync(kp);
            const cp = path.join(this.trustPath, certFileName);
            if (fs.existsSync(cp))
                fs.unlinkSync(cp);
        }
        catch { }
    }
    getTrustedNodes() {
        const config = this.configManager.get();
        const list = config.trust.trustedNodes || [];
        return list.map(n => {
            // Try to load certificate from disk
            let certificate;
            const certFileName = n.nodeId.replace(/[^a-zA-Z0-9]/g, '_') + '.crt';
            const cp = path.join(this.trustPath, certFileName);
            if (fs.existsSync(cp)) {
                certificate = fs.readFileSync(cp, 'utf8');
            }
            return {
                nodeId: n.nodeId,
                publicKey: n.publicKey,
                trustLevel: n.trustLevel,
                alias: n.alias,
                certificate,
                addedAt: new Date().toISOString()
            };
        });
    }
    isNodeTrusted(nodeId, requiredLevel = 0.5) {
        const config = this.configManager.get();
        const list = config.trust.trustedNodes || [];
        const node = list.find(n => n.nodeId === nodeId);
        if (!node)
            return false;
        return node.trustLevel >= requiredLevel;
    }
}
//# sourceMappingURL=TrustManager.js.map