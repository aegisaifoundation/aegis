import { z } from 'zod';
import { loadEnvironment } from '../utils/environment.js';
loadEnvironment();
const ConfigSchema = z.object({
    OLLAMA_HOST: z.string().default('http://127.0.0.1:11434'),
    MODEL_NAME: z.string().default('gemma4:latest'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});
export const config = ConfigSchema.parse(process.env);
