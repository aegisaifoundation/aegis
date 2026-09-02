import {
  INodeCapabilities,
  INodeLoad,
  CoordinationError,
  CoordinationErrorCode,
  CommunicationErrorCode
} from '@aegis/sdk';

export class NodeCapabilityRegistry {
  private capabilitiesMap = new Map<string, INodeCapabilities>();
  private loadMap = new Map<string, INodeLoad>();

  constructor(private readonly localNodeId: string) {
    if (!localNodeId || !localNodeId.startsWith('aegis://')) {
      throw new CoordinationError(
        CommunicationErrorCode.INVALID_NODE_ID as any,
        `NodeCapabilityRegistry requires valid canonical localNodeId starting with "aegis://". Received: "${localNodeId}"`
      );
    }
  }

  registerCapabilities(caps: INodeCapabilities): void {
    if (!caps.nodeId || !caps.nodeId.startsWith('aegis://')) {
      throw new CoordinationError(
        CommunicationErrorCode.INVALID_NODE_ID as any,
        `INodeCapabilities requires valid canonical nodeId. Received: "${caps.nodeId}"`
      );
    }

    this.capabilitiesMap.set(caps.nodeId, {
      ...caps,
      updatedAt: Date.now()
    });
  }

  getCapabilities(nodeId: string): INodeCapabilities | undefined {
    return this.capabilitiesMap.get(nodeId);
  }

  listCapabilities(): INodeCapabilities[] {
    return Array.from(this.capabilitiesMap.values());
  }

  removeCapabilities(nodeId: string): void {
    this.capabilitiesMap.delete(nodeId);
    this.loadMap.delete(nodeId);
  }

  updateNodeLoad(load: INodeLoad): void {
    if (!load.nodeId || !load.nodeId.startsWith('aegis://')) return;
    this.loadMap.set(load.nodeId, {
      ...load,
      timestamp: Date.now()
    });
  }

  getNodeLoad(nodeId: string): INodeLoad | undefined {
    return this.loadMap.get(nodeId);
  }

  clear(): void {
    this.capabilitiesMap.clear();
    this.loadMap.clear();
  }
}
