import { CollaborationEngine } from '../CollaborationEngine.js';
import { CapabilityInfo } from '../types/index.js';

export class SimulationManager {
  private nodes = new Map<string, CollaborationEngine>();

  constructor() {
    const nodeNames = ['Node_A', 'Node_B', 'Node_C', 'Node_D', 'Node_E'];
    for (const name of nodeNames) {
      const engine = new CollaborationEngine();
      const mockCtx: any = {
        getWorkspacePath: () => `./workspace/sim/${name}`,
        runtimeId: name
      };
      engine.initialize(mockCtx);
      this.nodes.set(name, engine);
    }
  }

  async runEndToEndDemo(): Promise<{
    sessionName: string;
    toolExchanged: boolean;
    knowledgeExchanged: boolean;
    reasoningCollected: boolean;
    consensusApproved: boolean;
    trustScoreNodeB: number;
  }> {
    console.log('\n[SimulationManager] Starting ASCIP Secure Collaboration Demo Run...');

    const nodeA = this.nodes.get('Node_A')!;
    const nodeB = this.nodes.get('Node_B')!;
    const nodeC = this.nodes.get('Node_C')!;
    const nodeD = this.nodes.get('Node_D')!;

    // Step 1: Advertise capabilities
    nodeB.getDiscoveryManager().getLocalCapabilities().tools.push('Medical_OCR_Tool');
    nodeC.getDiscoveryManager().getLocalCapabilities().skills.push('Medical_Knowledge_Package');
    nodeD.getDiscoveryManager().getLocalCapabilities().agents.push('Diagnostic_Agent');

    // Register remote capabilities in Node A's discovery registry
    nodeA.getDiscoveryManager().registerRemoteCapabilities('Node_B', nodeB.getDiscoveryManager().getLocalCapabilities());
    nodeA.getDiscoveryManager().registerRemoteCapabilities('Node_C', nodeC.getDiscoveryManager().getLocalCapabilities());
    nodeA.getDiscoveryManager().registerRemoteCapabilities('Node_D', nodeD.getDiscoveryManager().getLocalCapabilities());

    // Step 2: Discover Capabilities
    console.log('[SimulationManager] Node A searching for medical workflow resources...');
    const matchB = nodeA.DiscoverCapabilities({ tool: 'Medical_OCR_Tool' });
    const matchC = nodeA.DiscoverCapabilities({ skill: 'Medical_Knowledge_Package' });
    const matchD = nodeA.DiscoverCapabilities({ agent: 'Diagnostic_Agent' });

    console.log(`[SimulationManager] Discover outcomes - B: ${matchB.length}, C: ${matchC.length}, D: ${matchD.length}`);

    // Step 3: Create secure collaboration session
    console.log('[SimulationManager] Node A creating medical collaboration session...');
    const session = nodeA.CreateCollaboration('Clinical Analysis Collaboration', ['Node_A', 'Node_B', 'Node_C', 'Node_D']);

    // Nodes join collaboration session
    nodeB.JoinCollaboration(session.sessionId, 'Node_A');
    nodeC.JoinCollaboration(session.sessionId, 'Node_A');
    nodeD.JoinCollaboration(session.sessionId, 'Node_A');

    // Step 4: Tool Exchange (Node B to Node A)
    console.log('[SimulationManager] Node B transferring Medical OCR Tool to Node A...');
    const toolExchanged = await nodeA.RequestTool('Medical_OCR_Tool', 'Node_B');

    // Step 5: Knowledge Exchange (Node C to Node A)
    console.log('[SimulationManager] Node C sharing medical clinical guidelines knowledge package...');
    // Set policies to Medical to permit knowledge sharing
    nodeC.getPolicyManager().setPolicy('medical');
    nodeA.getPolicyManager().setPolicy('medical');

    const kp = nodeC.ShareKnowledge('clinical-guideline-v1', ['Guidelines: treat symptom X with treatment Y'], ['Node_A'], ['reasoning']);
    const knowledgeExchanged = await nodeA.PublishKnowledge(kp);

    // Step 6: Distributed Reasoning (Node D runs local reasoning, Node A collects and runs consensus)
    console.log('[SimulationManager] Node D performing reasoning locally on its own approved knowledge...');
    const prompt = 'Diagnose patient symptoms using Clinical Guidelines workflow';
    const reasoningOutcome = await nodeA.StartReasoning(prompt, ['Node_B', 'Node_C', 'Node_D']);
    const reasoningCollected = reasoningOutcome.response.includes('Locally analyzed');

    // Step 7: Consensus Tally
    const votes = reasoningOutcome.votes;
    const consensusResult = nodeA.VoteConsensus(votes, 'majority');
    const consensusApproved = consensusResult.approved;

    // Step 8: Update Reputation/Trust scores based on successful contribution
    nodeA.getReputationManager().recordContribution('Node_B', toolExchanged);
    nodeA.getReputationManager().recordContribution('Node_C', knowledgeExchanged);
    nodeA.getReputationManager().recordReasoningOutcome('Node_D', consensusResult.consensusScore);

    const trustScoreNodeB = nodeA.TrustMetrics('Node_B');

    // Close session
    nodeA.LeaveCollaboration(session.sessionId);
    nodeA.getSessionManager().closeSandbox(session.sessionId);

    console.log('[SimulationManager] ASCIP Demo Simulation Complete.\n');

    return {
      sessionName: session.name,
      toolExchanged,
      knowledgeExchanged,
      reasoningCollected,
      consensusApproved,
      trustScoreNodeB
    };
  }

  getNode(name: string): CollaborationEngine | undefined {
    return this.nodes.get(name);
  }
}
