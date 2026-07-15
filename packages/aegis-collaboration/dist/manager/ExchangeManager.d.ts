export declare class ExchangeManager {
    private installedArtifacts;
    packageAndSend(type: 'tool' | 'skill' | 'agent' | 'workflow', artifactId: string, targetNodeId: string): Promise<string>;
    verifyAndInstall(pkgString: string): Promise<{
        success: boolean;
        type?: string;
        id?: string;
    }>;
    hasInstalled(id: string): boolean;
}
