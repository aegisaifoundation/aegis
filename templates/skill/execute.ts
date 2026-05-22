import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// NOTE: If copying this template to `skills/shared/<SkillName>/`,
// change the relative path below from `../../aegis-core` to `../../../aegis-core`
import type { SkillContext } from '../../aegis-core/src/skills/SkillContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function execute(input: any, context: SkillContext): Promise<{ result: string }> {
  let text = '';
  if (typeof input === 'string') {
    text = input;
  } else if (input && typeof input.text === 'string') {
    text = input.text;
  } else {
    throw new Error('Input must be a string or contain a "text" field.');
  }

  // Load the prompt template
  const promptPath = path.join(__dirname, 'prompts', 'template.prompt');
  let promptTemplate = '';
  try {
    promptTemplate = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    // Fallback template
    promptTemplate = 'Process the following text:\n\n{{text}}';
  }

  const prompt = promptTemplate.replace('{{text}}', text);

  // Call the model provider (requires "provider" permission in permissions.json)
  const modelProvider = context.services.getModelProvider();
  const response = await modelProvider.generate(prompt);

  return { result: response.trim() };
}
