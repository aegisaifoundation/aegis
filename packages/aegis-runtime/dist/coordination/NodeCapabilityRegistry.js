import { CoordinationError, CommunicationErrorCode } from '@aegis/sdk';
export class NodeCapabilityRegistry {
    localNodeId;
    capabilitiesMap = new Map();
    loadMap = new Map();
    constructor(localNodeId) {
        this.localNodeId = localNodeId;
        if (!localNodeId || !localNodeId.startsWith('aegis://')) {
            throw new CoordinationError(CommunicationErrorCode.INVALID_NODE_ID, `NodeCapabilityRegistry requires valid canonical localNodeId starting with "aegis://". Received: "${localNodeId}"`);
        }
    }
    registerCapabilities(caps) {
        if (!caps.nodeId || !caps.nodeId.startsWith('aegis://')) {
            throw new CoordinationError(CommunicationErrorCode.INVALID_NODE_ID, `INodeCapabilities requires valid canonical nodeId. Received: "${caps.nodeId}"`);
        }
        this.capabilitiesMap.set(caps.nodeId, {
            ...caps,
            updatedAt: Date.now()
        });
    }
    getCapabilities(nodeId) {
        return this.capabilitiesMap.get(nodeId);
    }
    listCapabilities() {
        return Array.from(this.capabilitiesMap.values());
    }
    removeCapabilities(nodeId) {
        this.capabilitiesMap.delete(nodeId);
        this.loadMap.delete(nodeId);
    }
    updateNodeLoad(load) {
        if (!load.nodeId || !load.nodeId.startsWith('aegis://'))
            return;
        this.loadMap.set(load.nodeId, {
            ...load,
            timestamp: Date.now()
        });
    }
    getNodeLoad(nodeId) {
        return this.loadMap.get(nodeId);
    }
    clear() {
        this.capabilitiesMap.clear();
        this.loadMap.clear();
    }
}
