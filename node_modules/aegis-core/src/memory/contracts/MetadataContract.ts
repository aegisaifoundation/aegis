import { z } from 'zod';
import { MemoryContract } from './MemoryContract.js';
import { SessionMetadata, MemoryLifecycleState, SessionLifecycleState } from '../interfaces/MemoryTypes.js';

export const QuotasSchema = z.object({
  maxSessions: z.number(),
  maxHistorySize: z.number(),
  maxWorkingMemorySize: z.number(),
  maxSessionMemorySize: z.number(),
  maxSnapshots: z.number()
});

export const SessionMetadataSchema = z.object({
  sessionId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastAccessedAt: z.string(),
  memoryVersion: z.string(),
  lifecycleState: z.union([z.nativeEnum(MemoryLifecycleState), z.nativeEnum(SessionLifecycleState)]),
  checksums: z.object({
    history: z.string().optional(),
    sessionMemory: z.string().optional(),
    workingMemory: z.string().optional(),
    task: z.string().optional()
  }),
  confidence: z.record(z.number()),
  tags: z.array(z.string()),
  quotas: QuotasSchema
}).passthrough();

export class MetadataContract extends MemoryContract {
  /**
   * Validates raw data against the SessionMetadata schema.
   */
  public static validateMetadata(data: any): SessionMetadata {
    return this.validate(SessionMetadataSchema, data);
  }
}
