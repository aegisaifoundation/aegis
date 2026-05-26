import { Message } from '../types/Message.js';
export type MemoryEntry = Message;

export * from './MemoryManager.js';
export * from './MemoryGateway.js';
export * from './SessionMemory.js';

// Pluggable Interfaces
export * from './interfaces/IMemoryModule.js';
export * from './interfaces/IMemoryStore.js';
export * from './interfaces/IMemoryProvider.js';
export * from './interfaces/IMemoryGateway.js';
export * from './interfaces/IMemoryRefiner.js';
export * from './interfaces/MemoryTypes.js';

// Registry
export * from './registry/MemoryModuleRegistry.js';

// Core Subsystems
export * from './locking/MemoryLockManager.js';
export * from './refinement/MemoryRefiner.js';
export * from './transactions/MemoryTransactionManager.js';
export * from './indexing/MemoryIndexManager.js';
export * from './migration/MemoryMigrationManager.js';
export * from './recovery/MemoryRecoveryManager.js';
export * from './scheduler/MemoryCleanupScheduler.js';

// Utilities & Observability
export * from './utils/MemoryFileHelpers.js';
export * from './utils/MemoryObservability.js';

// Previous Infrastructure
export * from './Memory.js';
export * from './MemoryRegistry.js';
export * from './MemoryLoader.js';
export * from './MemoryContext.js';
