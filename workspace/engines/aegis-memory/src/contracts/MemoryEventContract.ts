import { z } from 'zod';
import { MemoryContract } from './MemoryContract.js';

export const MemoryEventPayloadSchema = z.object({
  sessionId: z.string(),
  memoryType: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]),
  actor: z.string().optional(),
  details: z.record(z.any()).optional()
});

export class MemoryEventContract extends MemoryContract {
  /**
   * Validates standard memory event payload parameters.
   */
  public static validateEventPayload(data: any): any {
    return this.validate(MemoryEventPayloadSchema, data);
  }
}
