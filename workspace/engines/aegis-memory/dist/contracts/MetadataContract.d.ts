import { z } from 'zod';
import { MemoryContract } from './MemoryContract.js';
import { SessionMetadata, MemoryLifecycleState, SessionLifecycleState } from '../interfaces/MemoryTypes.js';
export declare const QuotasSchema: z.ZodObject<{
    maxSessions: z.ZodNumber;
    maxHistorySize: z.ZodNumber;
    maxWorkingMemorySize: z.ZodNumber;
    maxSessionMemorySize: z.ZodNumber;
    maxSnapshots: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    maxSessions: number;
    maxHistorySize: number;
    maxWorkingMemorySize: number;
    maxSessionMemorySize: number;
    maxSnapshots: number;
}, {
    maxSessions: number;
    maxHistorySize: number;
    maxWorkingMemorySize: number;
    maxSessionMemorySize: number;
    maxSnapshots: number;
}>;
export declare const SessionMetadataSchema: z.ZodObject<{
    sessionId: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    lastAccessedAt: z.ZodString;
    memoryVersion: z.ZodString;
    lifecycleState: z.ZodUnion<[z.ZodNativeEnum<typeof MemoryLifecycleState>, z.ZodNativeEnum<typeof SessionLifecycleState>]>;
    checksums: z.ZodObject<{
        history: z.ZodOptional<z.ZodString>;
        sessionMemory: z.ZodOptional<z.ZodString>;
        workingMemory: z.ZodOptional<z.ZodString>;
        task: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        history?: string | undefined;
        sessionMemory?: string | undefined;
        workingMemory?: string | undefined;
        task?: string | undefined;
    }, {
        history?: string | undefined;
        sessionMemory?: string | undefined;
        workingMemory?: string | undefined;
        task?: string | undefined;
    }>;
    confidence: z.ZodRecord<z.ZodString, z.ZodNumber>;
    tags: z.ZodArray<z.ZodString, "many">;
    quotas: z.ZodObject<{
        maxSessions: z.ZodNumber;
        maxHistorySize: z.ZodNumber;
        maxWorkingMemorySize: z.ZodNumber;
        maxSessionMemorySize: z.ZodNumber;
        maxSnapshots: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        maxSessions: number;
        maxHistorySize: number;
        maxWorkingMemorySize: number;
        maxSessionMemorySize: number;
        maxSnapshots: number;
    }, {
        maxSessions: number;
        maxHistorySize: number;
        maxWorkingMemorySize: number;
        maxSessionMemorySize: number;
        maxSnapshots: number;
    }>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    sessionId: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    lastAccessedAt: z.ZodString;
    memoryVersion: z.ZodString;
    lifecycleState: z.ZodUnion<[z.ZodNativeEnum<typeof MemoryLifecycleState>, z.ZodNativeEnum<typeof SessionLifecycleState>]>;
    checksums: z.ZodObject<{
        history: z.ZodOptional<z.ZodString>;
        sessionMemory: z.ZodOptional<z.ZodString>;
        workingMemory: z.ZodOptional<z.ZodString>;
        task: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        history?: string | undefined;
        sessionMemory?: string | undefined;
        workingMemory?: string | undefined;
        task?: string | undefined;
    }, {
        history?: string | undefined;
        sessionMemory?: string | undefined;
        workingMemory?: string | undefined;
        task?: string | undefined;
    }>;
    confidence: z.ZodRecord<z.ZodString, z.ZodNumber>;
    tags: z.ZodArray<z.ZodString, "many">;
    quotas: z.ZodObject<{
        maxSessions: z.ZodNumber;
        maxHistorySize: z.ZodNumber;
        maxWorkingMemorySize: z.ZodNumber;
        maxSessionMemorySize: z.ZodNumber;
        maxSnapshots: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        maxSessions: number;
        maxHistorySize: number;
        maxWorkingMemorySize: number;
        maxSessionMemorySize: number;
        maxSnapshots: number;
    }, {
        maxSessions: number;
        maxHistorySize: number;
        maxWorkingMemorySize: number;
        maxSessionMemorySize: number;
        maxSnapshots: number;
    }>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    sessionId: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    lastAccessedAt: z.ZodString;
    memoryVersion: z.ZodString;
    lifecycleState: z.ZodUnion<[z.ZodNativeEnum<typeof MemoryLifecycleState>, z.ZodNativeEnum<typeof SessionLifecycleState>]>;
    checksums: z.ZodObject<{
        history: z.ZodOptional<z.ZodString>;
        sessionMemory: z.ZodOptional<z.ZodString>;
        workingMemory: z.ZodOptional<z.ZodString>;
        task: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        history?: string | undefined;
        sessionMemory?: string | undefined;
        workingMemory?: string | undefined;
        task?: string | undefined;
    }, {
        history?: string | undefined;
        sessionMemory?: string | undefined;
        workingMemory?: string | undefined;
        task?: string | undefined;
    }>;
    confidence: z.ZodRecord<z.ZodString, z.ZodNumber>;
    tags: z.ZodArray<z.ZodString, "many">;
    quotas: z.ZodObject<{
        maxSessions: z.ZodNumber;
        maxHistorySize: z.ZodNumber;
        maxWorkingMemorySize: z.ZodNumber;
        maxSessionMemorySize: z.ZodNumber;
        maxSnapshots: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        maxSessions: number;
        maxHistorySize: number;
        maxWorkingMemorySize: number;
        maxSessionMemorySize: number;
        maxSnapshots: number;
    }, {
        maxSessions: number;
        maxHistorySize: number;
        maxWorkingMemorySize: number;
        maxSessionMemorySize: number;
        maxSnapshots: number;
    }>;
}, z.ZodTypeAny, "passthrough">>;
export declare class MetadataContract extends MemoryContract {
    /**
     * Validates raw data against the SessionMetadata schema.
     */
    static validateMetadata(data: any): SessionMetadata;
}
