import fs from 'fs';
import path from 'path';
import { NodeConfigManager } from '../NodeConfiguration/NodeConfigManager.js';

export interface TrustedNode {
  nodeId: string;
  publicKey: string;
  certificate?: string;
  trustLevel: number;
  alias?: string;
  addedAt: string;
}

export class TrustManager {
  private trustPath: string;

  constructor(private configManager: NodeConfigManager, private workspaceRoot: string) {
    this.trustPath = path.join(this.workspaceRoot, 'trust');
  }

  initialize(): void {
    if (!fs.existsSync(this.trustPath)) {
      fs.mkdirSync(this.trustPath, { recursive: true });
    }
  }

  addTrustedNode(node: Omit<TrustedNode, 'addedAt'>): void {
    this.initialize();
    
    const trustedNode: TrustedNode = {
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
    } else {
      list.push(trustEntry);
    }

    this.configManager.update({
      trust: {
        trustedNodes: list
      }
    });
  }

  removeTrustedNode(nodeId: string): void {
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
      if (fs.existsSync(kp)) fs.unlinkSync(kp);
      const cp = path.join(this.trustPath, certFileName);
      if (fs.existsSync(cp)) fs.unlinkSync(cp);
    } catch {}
  }

  getTrustedNodes(): TrustedNode[] {
    const config = this.configManager.get();
    const list = config.trust.trustedNodes || [];
    
    return list.map(n => {
      // Try to load certificate from disk
      let certificate: string | undefined;
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

  isNodeTrusted(nodeId: string, requiredLevel = 0.5): boolean {
    const config = this.configManager.get();
    const list = config.trust.trustedNodes || [];
    const node = list.find(n => n.nodeId === nodeId);
    
    if (!node) return false;
    return node.trustLevel >= requiredLevel;
  }
}
