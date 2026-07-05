import { z } from 'zod';
export declare class MemoryContract {
    /**
     * Helper to parse data against a Zod schema, throwing clean validation errors.
     */
    static validate<T>(schema: z.ZodSchema<T>, data: any): T;
}
