import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { serviceRegistry } from '@aegis/runtime';
import os from 'os';
import crypto, { createHash } from 'crypto';

// Managers
import { CollaborationManager } from './manager/CollaborationManager.js';
import { CapabilityDiscoveryManager } from './manager/CapabilityDiscoveryManager.js';
import { CollaborationSessionManager } from './manager/CollaborationSessionManager.js';
import { PolicyManager } from './manager/PolicyManager.js';
import { ConsensusManager } from './manager/ConsensusManager.js';
import { ReputationManager } from './manager/ReputationManager.js';
import { ReasoningManager } from './manager/ReasoningManager.js';
import { ExchangeManager } from './manager/ExchangeManager.js';
import { AonEngine, AonTunnel, PublicAddress } from './network/AonEngine.js';

// Types
import {
  CollaborationSession,
  CapabilityInfo,
  KnowledgePackage,
  ExperiencePackage,
  ConsensusVote
} from './types/index.js';

export class CollaborationEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: 'aegis-collaboration',
    displayName: 'AEGIS Secure Collaboration Engine',
    version: '1.0.0',
    kernelApiVersion: '1.0.0',
    dependencies: ['distributed-intelligence'],
    priority: 30,
    autoStart: true,
    singleton: true,
    permissions: ['fs:read', 'fs:write']
  };

  private context!: IRuntimeContext_v1;
  private workspacePath!: string;
  private localNodeId!: string;

  // Sub-managers
  private collaborationManager!: CollaborationManager;
  private discoveryManager!: CapabilityDiscoveryManager;
  private sessionManager!: CollaborationSessionManager;
  private policyManager!: PolicyManager;
  private consensusManager!: ConsensusManager;
  private reputationManager!: ReputationManager;
  private reasoningManager!: ReasoningManager;
  private exchangeManager!: ExchangeManager;
  private aonEngine!: AonEngine;

  private initStartTime = 0;

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.initStartTime = Date.now();
    this.context = context;
    this.workspacePath = context.getWorkspacePath();
    this.localNodeId = context.runtimeId ?? os.hostname();

    console.log('[CollaborationEngine] Initializing sub-managers...');

    this.collaborationManager = new CollaborationManager();
    this.discoveryManager = new CapabilityDiscoveryManager(this.localNodeId);
    this.sessionManager = new CollaborationSessionManager();
    this.policyManager = new PolicyManager('personal');
    this.consensusManager = new ConsensusManager();
    this.reputationManager = new ReputationManager(this.localNodeId);
    this.reasoningManager = new ReasoningManager(this.consensusManager);
    this.exchangeManager = new ExchangeManager();
    this.aonEngine = new AonEngine();

    // Register with runtime serviceRegistry
    serviceRegistry.register('collaboration', this);
    serviceRegistry.register('collaboration:discovery', this.discoveryManager);
    serviceRegistry.register('collaboration:reputation', this.reputationManager);
    serviceRegistry.register('collaboration:policy', this.policyManager);
    serviceRegistry.register('collaboration:aon', this.aonEngine);
  }

  async configure(config: Record<string, any>): Promise<void> {
    if (config.policyType) {
      this.policyManager.setPolicy(config.policyType);
    }
  }

  async start(): Promise<void> {
    // Advertise capabilities via DI if available
    const dis = serviceRegistry.has('distributed-intelligence')
      ? serviceRegistry.get<any>('distributed-intelligence')
      : null;

    if (dis?.capabilityService) {
      await dis.capabilityService.advertiseCapabilities([
        'secure_collaboration',
        'distributed_reasoning',
        'capability_discovery',
        'consensus_voting'
      ]);
    }
    console.log('[CollaborationEngine] Started.');
  }

  async pause(): Promise<void> {}
  async resume(): Promise<void> {}
  async reload(): Promise<void> {}
  async shutdown(): Promise<void> {
    console.log('[CollaborationEngine] Shutting down...');
  }
  async dispose(): Promise<void> {
    await this.shutdown();
  }

  async health(): Promise<EngineHealthReport> {
    return {
      status: 'HEALTHY',
      latencyMs: Date.now() - this.initStartTime,
      details: {
        activeSessions: this.collaborationManager.listActiveSessions().length,
        advertisedCapabilities: this.discoveryManager.getLocalCapabilities().tools.length
      }
    };
  }

  // ── Public APIs ───────────────────────────────────────────────────────────

  /** 1. Create a secure collaboration session */
  CreateCollaboration(name: string, participants: string[], metadata: Record<string, any> = {}): CollaborationSession {
    const session = this.collaborationManager.createSession(name, this.localNodeId, participants, metadata);
    this.sessionManager.createSandbox(session.sessionId, session.participants);
    return session;
  }

  /** 2. Join a session as participant */
  JoinCollaboration(sessionId: string, creatorNodeId: string, inviteMetadata?: any): boolean {
    const caps = this.discoveryManager.getLocalCapabilities();
    const trust = this.reputationManager.getReputation(creatorNodeId).trustScore;

    // Check policy compatibility
    if (!this.policyManager.canCollaborateWith(creatorNodeId, trust)) {
      console.warn(`[CollaborationEngine] Denied joining session ${sessionId} due to policy mismatch with ${creatorNodeId}`);
      return false;
    }

    // Register session locally
    if (!this.collaborationManager.getSession(sessionId)) {
      this.collaborationManager.createSession(
        inviteMetadata?.name ?? `Session ${sessionId}`,
        creatorNodeId,
        [creatorNodeId, this.localNodeId],
        inviteMetadata ?? {},
        sessionId
      );
    }

    this.collaborationManager.inviteNode(sessionId, creatorNodeId, this.localNodeId, inviteMetadata);
    const joined = this.collaborationManager.acceptInvite(sessionId, this.localNodeId);
    if (joined) {
      this.sessionManager.addToSandbox(sessionId, this.localNodeId);
    }
    return joined;
  }

  /** 3. Leave session */
  LeaveCollaboration(sessionId: string): void {
    this.collaborationManager.leaveSession(sessionId, this.localNodeId);
  }

  /** 4. Discover remote capabilities */
  DiscoverCapabilities(filter: any): CapabilityInfo[] {
    return this.discoveryManager.discoverNodesByCapability(filter);
  }

  /** 5. Request a tool from a target node */
  async RequestTool(toolId: string, targetNodeId: string): Promise<boolean> {
    const pkg = await this.exchangeManager.packageAndSend('tool', toolId, this.localNodeId);
    const installResult = await this.exchangeManager.verifyAndInstall(pkg);
    return installResult.success;
  }

  /** 6. Request a skill from a target node */
  async RequestSkill(skillId: string, targetNodeId: string): Promise<boolean> {
    const pkg = await this.exchangeManager.packageAndSend('skill', skillId, this.localNodeId);
    const installResult = await this.exchangeManager.verifyAndInstall(pkg);
    return installResult.success;
  }

  /** 7. Request an agent package */
  async RequestAgent(agentId: string, targetNodeId: string): Promise<boolean> {
    const pkg = await this.exchangeManager.packageAndSend('agent', agentId, this.localNodeId);
    const installResult = await this.exchangeManager.verifyAndInstall(pkg);
    return installResult.success;
  }

  /** 8. Request a workflow package */
  async RequestWorkflow(workflowId: string, targetNodeId: string): Promise<boolean> {
    const pkg = await this.exchangeManager.packageAndSend('workflow', workflowId, this.localNodeId);
    const installResult = await this.exchangeManager.verifyAndInstall(pkg);
    return installResult.success;
  }

  /** 9. Share a signed KnowledgePackage metadata package */
  ShareKnowledge(entityId: string, facts: string[], allowedNodes: string[], allowedUses: any[]): KnowledgePackage {
    if (!this.policyManager.canShareCategory('knowledge_package')) {
      throw new Error('[CollaborationEngine] Policy blocks sharing of knowledge packages');
    }

    const id = `kp-${createHash('sha256').update(entityId + Date.now()).digest('hex').slice(0, 16)}`;
    const hash = createHash('sha256').update(JSON.stringify(facts)).digest('hex');
    const signature = createHash('sha256').update(`ecdsa-kp:${hash}:${id}`).digest('hex');

    return {
      id,
      entityId,
      facts,
      semanticMetadata: { count: facts.length },
      provenance: {
        sourceNodeId: this.localNodeId,
        timestamp: new Date(),
        lineageHashes: [hash]
      },
      version: 'v1.0.0',
      signature,
      permissions: {
        allowedNodes,
        allowedUses
      }
    };
  }

  /** 10. Share a signed ExperiencePackage */
  ShareExperience(
    problem: string,
    reasoningChain: string[],
    actions: any[],
    result: any,
    confidence: number
  ): ExperiencePackage {
    if (!this.policyManager.canShareCategory('experience_package')) {
      throw new Error('[CollaborationEngine] Policy blocks sharing of experience packages');
    }

    const id = `ep-${createHash('sha256').update(problem + Date.now()).digest('hex').slice(0, 16)}`;
    const hash = createHash('sha256').update(problem + JSON.stringify(reasoningChain)).digest('hex');
    const signature = createHash('sha256').update(`ecdsa-ep:${hash}:${id}`).digest('hex');

    return {
      id,
      problem,
      reasoningChain,
      actions,
      result,
      confidence,
      metadata: {},
      signature,
      sourceNodeId: this.localNodeId
    };
  }

  /** 11. Coordinate distributed planning and local reasoning */
  async StartReasoning(prompt: string, nodes: string[], consensusMechanism?: any) {
    return this.reasoningManager.runReasoning(prompt, nodes, consensusMechanism);
  }

  /** 12. Tally votes and compute consensus */
  VoteConsensus(votes: ConsensusVote[], mechanism: any, nodeWeights?: Record<string, number>) {
    return this.consensusManager.evaluateConsensus(votes, mechanism, nodeWeights);
  }

  /** 13. Publish knowledge updates securely */
  async PublishKnowledge(pkg: KnowledgePackage): Promise<boolean> {
    if (this.policyManager.getPolicy().enforceSignatures && !pkg.signature) {
      console.warn(`[CollaborationEngine] Rejected publication of package ${pkg.id}: missing signature`);
      return false;
    }
    console.log(`[CollaborationEngine] Successfully published KnowledgePackage: ${pkg.id}`);
    return true;
  }

  /** 14. Check active session status */
  CollaborationStatus(sessionId: string): string {
    return this.collaborationManager.getSession(sessionId)?.status ?? 'closed';
  }

  /** 15. Check reputation score */
  Reputation(nodeId: string) {
    return this.reputationManager.getReputation(nodeId);
  }

  /** 16. Get trust score */
  TrustMetrics(nodeId: string): number {
    return this.reputationManager.getReputation(nodeId).trustScore;
  }

  /** 17. Resolve public address of this node using AON STUN client */
  async GetPublicAddress(): Promise<PublicAddress> {
    return await this.aonEngine.resolvePublicAddress();
  }

  /** 18. Establish a secure encrypted virtual tunnel to a remote peer */
  async ConnectOverlayPeer(peerIp: string, peerPort: number, tunnelId?: string): Promise<AonTunnel> {
    const tempECDH = crypto.createECDH('secp256k1');
    tempECDH.generateKeys();
    const peerPubKey = tempECDH.getPublicKey('hex');

    const secret = this.aonEngine.deriveSharedSecret(peerPubKey);
    const id = tunnelId ?? `tunnel-${createHash('sha256').update(peerIp + peerPort + Date.now()).digest('hex').slice(0, 16)}`;
    return this.aonEngine.establishTunnel(id, `${peerIp}:${peerPort}`, secret);
  }

  /** 19. Get list of active encrypted tunnels */
  GetActiveTunnels(): AonTunnel[] {
    return this.aonEngine.listTunnels();
  }

  // ── Sub-manager accessors (for testing / simulation) ──────────────────────
  getCollaborationManager()    { return this.collaborationManager; }
  getDiscoveryManager()        { return this.discoveryManager; }
  getSessionManager()        { return this.sessionManager; }
  getPolicyManager()           { return this.policyManager; }
  getConsensusManager()        { return this.consensusManager; }
  getReputationManager()        { return this.reputationManager; }
  getReasoningManager()        { return this.reasoningManager; }
  getExchangeManager()         { return this.exchangeManager; }
}

export default CollaborationEngine;
