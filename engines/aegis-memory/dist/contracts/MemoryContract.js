import { z } from 'zod';
export class MemoryContract {
    /**
     * Helper to parse data against a Zod schema, throwing clean validation errors.
     */
    static validate(schema, data) {
        try {
            return schema.parse(data);
        }
        catch (err) {
            if (err instanceof z.ZodError) {
                const issues = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
                throw new Error(`Memory contract validation failed: ${issues}`);
            }
            throw new Error(`Memory contract validation failed: ${err.message || err}`);
        }
    }
}
