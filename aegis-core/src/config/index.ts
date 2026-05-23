import { z } from 'zod';
import { loadEnvironment } from '../utils/environment.js';

loadEnvironment();

const ConfigSchema = z.object({
  OLLAMA_HOST: z.string().default('http://127.0.0.1:11434'),
  MODEL_NAME: z.string().default('gemma4:latest'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MODEL_PROVIDER: z.string().default('local/ollama'),
  API_PROVIDER_URL: z.string().default('https://api.openai.com/v1'),
  API_PROVIDER_KEY: z.string().default('mock-key'),
  API_PROVIDER_MODEL: z.string().default('gpt-4o'),
});

export const config = ConfigSchema.parse(process.env);

export * from './ConfigurationManager.js';

