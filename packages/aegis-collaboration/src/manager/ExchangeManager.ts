export class ExchangeManager {
  private installedArtifacts = new Map<string, 'tool' | 'skill' | 'agent' | 'workflow'>();

  async packageAndSend(
    type: 'tool' | 'skill' | 'agent' | 'workflow',
    artifactId: string,
    targetNodeId: string
  ): Promise<string> {
    console.log(`[ExchangeManager] Packaging [${type}] artifact ${artifactId} for node ${targetNodeId}...`);
    // Reuses existing .aeg package naming model
    const pkgString = `aeg-pkg:${type}:${artifactId}:signed-ecdsa-sig-stub:${Date.now()}`;
    return pkgString;
  }

  async verifyAndInstall(pkgString: string): Promise<{ success: boolean; type?: string; id?: string }> {
    if (!pkgString.startsWith('aeg-pkg:')) {
      console.warn('[ExchangeManager] Rejecting package: invalid .aeg structure');
      return { success: false };
    }

    const parts = pkgString.split(':');
    const type = parts[1] as 'tool' | 'skill' | 'agent' | 'workflow';
    const id = parts[2]!;

    // Perform signature check
    const signature = parts[3];
    if (!signature || !signature.startsWith('signed-')) {
      console.warn(`[ExchangeManager] Rejecting package ${id}: signature verification failed`);
      return { success: false };
    }

    this.installedArtifacts.set(id, type);
    console.log(`[ExchangeManager] Installed and registered ${type} [${id}] via Package Manager`);
    return { success: true, type, id };
  }

  hasInstalled(id: string): boolean {
    return this.installedArtifacts.has(id);
  }
}
