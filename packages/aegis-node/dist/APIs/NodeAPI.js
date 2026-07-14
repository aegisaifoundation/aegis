import { capabilityManager, CapabilityType } from '@aegis/runtime';
export class NodeAPI {
    manager;
    constructor(manager) {
        this.manager = manager;
    }
    GetNodeInfo() {
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
    async InstallPackage(packagePathOrId, options) {
        return await this.manager.getOrchestrator().installPackage(packagePathOrId, options);
    }
    async UninstallPackage(packageId, options) {
        return await this.manager.getOrchestrator().uninstallPackage(packageId, options);
    }
    ListCapabilities() {
        return this.manager.getCapabilityRegistry().getCapabilitiesView();
    }
    ListInstalledPackages(type) {
        return this.manager.getNodeRegistry().getInstalledPackages(type);
    }
    NodeStatus() {
        return this.manager.status();
    }
    RuntimeStatus() {
        return this.manager.getRuntime().getStatus();
    }
    async AttachEngine(engineId) {
        await this.manager.getRuntime().startEngine(engineId);
    }
    async DetachEngine(engineId) {
        await this.manager.getRuntime().stopEngine(engineId);
    }
    async AttachTool(toolPath) {
        await capabilityManager.add(CapabilityType.TOOL, toolPath);
    }
    async DetachTool(toolPath) {
        await capabilityManager.remove(CapabilityType.TOOL, toolPath);
    }
    async AttachSkill(skillPath) {
        await capabilityManager.add(CapabilityType.SKILL, skillPath);
    }
    async DetachSkill(skillPath) {
        await capabilityManager.remove(CapabilityType.SKILL, skillPath);
    }
}
//# sourceMappingURL=NodeAPI.js.map