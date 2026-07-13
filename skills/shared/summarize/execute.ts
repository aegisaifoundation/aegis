import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SkillContext } from '@aegis/skills';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function execute(input: any, context: SkillContext): Promise<{ summary: string }> {
  let text = '';
  if (typeof input === 'string') {
    text = input;
  } else if (input && typeof input.text === 'string') {
    text = input.text;
  } else {
    throw new Error('Input must be a string or contain a "text" field.');
  }

  // Load the prompt template
  const promptPath = path.join(__dirname, 'prompts', 'summarize.prompt');
  let promptTemplate = '';
  try {
    promptTemplate = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    // Fallback template
    promptTemplate = 'Summarize the following text:\n\n{{text}}';
  }

  const prompt = promptTemplate.replace('{{text}}', text);

  // Call the model provider
  const modelProvider = context.services.getModelProvider();
  const summary = await modelProvider.generate(prompt);

  return { summary: summary.trim() };
}
