import execute from './execute.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'command.json'), 'utf8'));

export default {
  ...manifest,
  execute
};
