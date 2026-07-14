import { NodeManager } from '../NodeManager/NodeManager.js';
import { PackageInfo, PackageType } from '@aegis/package-manager';
export declare class NodeAPI {
    private manager;
    constructor(manager: NodeManager);
    GetNodeInfo(): Record<string, any>;
    InstallPackage(packagePathOrId: string, options?: any): Promise<string>;
    UninstallPackage(packageId: string, options?: any): Promise<string>;
    ListCapabilities(): any[];
    ListInstalledPackages(type?: PackageType): PackageInfo[];
    NodeStatus(): Record<string, any>;
    RuntimeStatus(): string;
    AttachEngine(engineId: string): Promise<void>;
    DetachEngine(engineId: string): Promise<void>;
    AttachTool(toolPath: string): Promise<void>;
    DetachTool(toolPath: string): Promise<void>;
    AttachSkill(skillPath: string): Promise<void>;
    DetachSkill(skillPath: string): Promise<void>;
}
