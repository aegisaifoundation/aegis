import { randomUUID } from 'crypto';

export interface ResourceAllocation {
  readonly sessionId: string;
  readonly nodeId: string;
  readonly cpu: number;
  readonly memory: number;
  readonly storage: number;
  readonly gpuTimeMs: number;
  readonly approved: boolean;
}

export class CollaborationSessionManager {
  private sessionSandboxes = new Map<string, Set<string>>(); // sessionId -> Set of NodeIds
  private resourceAllocations = new Map<string, ResourceAllocation>(); // sessionId:nodeId -> allocation

  createSandbox(sessionId: string, initialNodeIds: string[]): void {
    this.sessionSandboxes.set(sessionId, new Set(initialNodeIds));
    console.log(`[CollaborationSessionManager] Sandboxed workspace created for session ${sessionId}`);
  }

  isAuthorized(sessionId: string, nodeId: string): boolean {
    const sandbox = this.sessionSandboxes.get(sessionId);
    return sandbox ? sandbox.has(nodeId) : false;
  }

  addToSandbox(sessionId: string, nodeId: string): void {
    const sandbox = this.sessionSandboxes.get(sessionId);
    if (sandbox) {
      sandbox.add(nodeId);
      console.log(`[CollaborationSessionManager] Added ${nodeId} to sandbox of session ${sessionId}`);
    }
  }

  async negotiateResource(
    sessionId: string,
    nodeId: string,
    required: { cpu?: number; memory?: number; storage?: number; gpuTimeMs?: number }
  ): Promise<ResourceAllocation> {
    const key = `${sessionId}:${nodeId}`;
    
    // Simulate policy checks and resource availability negotiation
    const approved = (required.gpuTimeMs ?? 0) < 50000 && (required.memory ?? 0) < 8192;
    
    const allocation: ResourceAllocation = {
      sessionId,
      nodeId,
      cpu: required.cpu ?? 1,
      memory: required.memory ?? 1024,
      storage: required.storage ?? 1000,
      gpuTimeMs: required.gpuTimeMs ?? 0,
      approved
    };

    this.resourceAllocations.set(key, allocation);
    console.log(`[CollaborationSessionManager] Resource negotiation for ${nodeId} in ${sessionId}: ${approved ? 'APPROVED' : 'DENIED'}`);
    return allocation;
  }

  getAllocation(sessionId: string, nodeId: string): ResourceAllocation | undefined {
    return this.resourceAllocations.get(`${sessionId}:${nodeId}`);
  }

  closeSandbox(sessionId: string): void {
    this.sessionSandboxes.delete(sessionId);
    for (const key of this.resourceAllocations.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.resourceAllocations.delete(key);
      }
    }
    console.log(`[CollaborationSessionManager] Destroyed sandbox and allocations for session ${sessionId}`);
  }
}
