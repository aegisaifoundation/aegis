import { NodeManager } from '../NodeManager/NodeManager.js';
import { PackageInfo, PackageType } from '@aegis/package-manager';
import { capabilityManager, CapabilityType } from '@aegis/runtime';

export class NodeAPI {
  constructor(private manager: NodeManager) {}

  GetNodeInfo(): Record<string, any> {
    const identity = this.manager.getIdentity();
    return {
      nodeId: identity?.nodeId || 'unknown',
      name: identity?.name || 'unknown',
      edition: identity?.edition || 'unknown',
      role: identity?.role || 'unknown',
      createdAt: identity?.createdAt || 'unknown',
      fingerprint: identity?.fingerprint || 'unknown',
      publicKey: identity?.publicKey || 'unknown'
    };
  }

  async InstallPackage(packagePathOrId: string, options?: any): Promise<string> {
    return await this.manager.getOrchestrator().installPackage(packagePathOrId, options);
  }

  async UninstallPackage(packageId: string, options?: any): Promise<string> {
    return await this.manager.getOrchestrator().uninstallPackage(packageId, options);
  }

  ListCapabilities(): any[] {
    return this.manager.getCapabilityRegistry().getCapabilitiesView();
  }

  ListInstalledPackages(type?: PackageType): PackageInfo[] {
    return this.manager.getNodeRegistry().getInstalledPackages(type);
  }

  NodeStatus(): Record<string, any> {
    return this.manager.status();
  }

  RuntimeStatus(): string {
    return this.manager.getRuntime().getStatus();
  }

  async AttachEngine(engineId: string): Promise<void> {
    await this.manager.getRuntime().startEngine(engineId);
  }

  async DetachEngine(engineId: string): Promise<void> {
    await this.manager.getRuntime().stopEngine(engineId);
  }

  async AttachTool(toolPath: string): Promise<void> {
    await capabilityManager.add(CapabilityType.TOOL, toolPath);
  }

  async DetachTool(toolPath: string): Promise<void> {
    await capabilityManager.remove(CapabilityType.TOOL, toolPath);
  }

  async AttachSkill(skillPath: string): Promise<void> {
    await capabilityManager.add(CapabilityType.SKILL, skillPath);
  }

  async DetachSkill(skillPath: string): Promise<void> {
    await capabilityManager.remove(CapabilityType.SKILL, skillPath);
  }
}
