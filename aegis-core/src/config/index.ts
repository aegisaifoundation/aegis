import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const ConfigSchema = z.object({
  OLLAMA_HOST: z.string().default('http://127.0.0.1:11434'),
  MODEL_NAME: z.string().default('gemma4:latest'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const config = ConfigSchema.parse(process.env);
