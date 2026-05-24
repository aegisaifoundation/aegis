import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnvironment() {
  // Try loading local aegis-core/.env (two levels up from utils)
  const localEnvPath = path.resolve(__dirname, '../../.env');
  dotenv.config({ path: localEnvPath });

  // Try loading root workspace .env (three levels up from utils)
  const rootEnvPath = path.resolve(__dirname, '../../../.env');
  dotenv.config({ path: rootEnvPath });
}
