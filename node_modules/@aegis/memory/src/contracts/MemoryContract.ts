import { z } from 'zod';

export class MemoryContract {
  /**
   * Helper to parse data against a Zod schema, throwing clean validation errors.
   */
  public static validate<T>(schema: z.ZodSchema<T>, data: any): T {
    try {
      return schema.parse(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const issues = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        throw new Error(`Memory contract validation failed: ${issues}`);
      }
      throw new Error(`Memory contract validation failed: ${err.message || err}`);
    }
  }
}
