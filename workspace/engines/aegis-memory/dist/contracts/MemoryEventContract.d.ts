import { z } from 'zod';
import { MemoryContract } from './MemoryContract.js';
export declare const MemoryEventPayloadSchema: z.ZodObject<{
    sessionId: z.ZodString;
    memoryType: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    actor: z.ZodOptional<z.ZodString>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    timestamp: string | number;
    details?: Record<string, any> | undefined;
    actor?: string | undefined;
    memoryType?: string | undefined;
}, {
    sessionId: string;
    timestamp: string | number;
    details?: Record<string, any> | undefined;
    actor?: string | undefined;
    memoryType?: string | undefined;
}>;
export declare class MemoryEventContract extends MemoryContract {
    /**
     * Validates standard memory event payload parameters.
     */
    static validateEventPayload(data: any): any;
}
