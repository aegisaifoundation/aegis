import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnvironment() {
  const localEnvPath = path.resolve(__dirname, '../../.env');
  dotenv.config({ path: localEnvPath });

  const rootEnvPath = path.resolve(__dirname, '../../../../.env');
  dotenv.config({ path: rootEnvPath });

  const cwdEnvPath = path.resolve(process.cwd(), '.env');
  dotenv.config({ path: cwdEnvPath });
}
