// Main engine export
export { DistributedLearningEngine } from './DistributedLearningEngine.js';
import { DistributedLearningEngine } from './DistributedLearningEngine.js';
export default DistributedLearningEngine;

// Types
export * from './types/index.js';

// Strategy interface and implementations
export { ILearningStrategy } from './strategy/ILearningStrategy.js';
export { FederatedLearningStrategy } from './strategy/FederatedLearningStrategy.js';
export { SwarmLearningStrategy } from './strategy/SwarmLearningStrategy.js';
export { HierarchicalStrategy } from './strategy/HierarchicalStrategy.js';
export { GossipStrategy } from './strategy/GossipStrategy.js';

// Managers
export { LearningManager } from './manager/LearningManager.js';
export { RoundManager } from './manager/RoundManager.js';
export { AggregationManager } from './manager/AggregationManager.js';
export { LearningCheckpointManager } from './manager/LearningCheckpointManager.js';
export { LearningVersionManager } from './manager/LearningVersionManager.js';

// Model layer
export { ModelManager } from './model/ModelManager.js';
export { LoRAManager } from './model/LoRAManager.js';
export { LocalTrainer } from './model/LocalTrainer.js';

// Privacy, Policy, Profile
export { PrivacyManager } from './privacy/PrivacyManager.js';
export { LearningPolicies } from './policy/LearningPolicies.js';
export { LearningProfile, LearningProfileRegistry } from './profile/LearningProfile.js';

// Simulation
export { MockNode } from './simulation/MockNode.js';
export { SimulationMode } from './simulation/SimulationMode.js';
