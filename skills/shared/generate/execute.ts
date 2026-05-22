import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SkillContext } from '../../../aegis-core/src/skills/SkillContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function execute(input: any, context: SkillContext): Promise<{ generated: string }> {
  if (!input || typeof input !== 'object') {
    throw new Error('Input must be an object containing a "prompt" field.');
  }

  let promptTemplate = input.prompt || '';
  const variables = input.variables || {};

  // Interpolate variables (e.g. {{key}} -> value)
  let interpolatedPrompt = promptTemplate;
  for (const key of Object.keys(variables)) {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    interpolatedPrompt = interpolatedPrompt.replace(placeholder, String(variables[key]));
  }

  // Load the wrapper prompt from generate.prompt if it exists
  const wrapperPath = path.join(__dirname, 'prompts', 'generate.prompt');
  let wrapper = '';
  try {
    wrapper = fs.readFileSync(wrapperPath, 'utf8');
  } catch (err) {
    wrapper = '{{prompt}}';
  }

  const finalPrompt = wrapper.replace('{{prompt}}', interpolatedPrompt);

  // Call the model provider
  const modelProvider = context.services.getModelProvider();
  const generatedText = await modelProvider.generate(finalPrompt);

  return { generated: generatedText.trim() };
}
