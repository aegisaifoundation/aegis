import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SkillContext } from '../../../aegis-core/src/skills/SkillContext.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();

  // Remove markdown code blocks if present
  if (cleaned.startsWith('```')) {
    // Strip leading ```json or ```
    cleaned = cleaned.replace(/^```(json)?\s*/i, '');
    // Strip trailing ```
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

function enforceSchema(parsedData: any, schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return parsedData;
  }

  const result: any = {};
  for (const key of Object.keys(schema)) {
    const expectedType = schema[key];
    const actualValue = parsedData[key];

    if (actualValue === undefined) {
      // Fallback normalization
      result[key] = null;
      continue;
    }

    if (typeof expectedType === 'string') {
      if (expectedType === 'string') {
        result[key] = actualValue !== null ? String(actualValue) : '';
      } else if (expectedType === 'number') {
        const num = Number(actualValue);
        result[key] = isNaN(num) ? 0 : num;
      } else if (expectedType === 'boolean') {
        result[key] = Boolean(actualValue);
      } else if (expectedType === 'array') {
        result[key] = Array.isArray(actualValue) ? actualValue : [actualValue];
      } else {
        result[key] = actualValue;
      }
    } else if (typeof expectedType === 'object' && expectedType !== null) {
      // Nested schema enforcement
      result[key] = enforceSchema(actualValue || {}, expectedType);
    } else {
      result[key] = actualValue;
    }
  }

  return result;
}

export default async function execute(input: any, context: SkillContext): Promise<{ data: any, raw: string, success: boolean }> {
  if (!input || typeof input !== 'object') {
    throw new Error('Input must be an object containing "text" and "schema" fields.');
  }

  const text = input.text || '';
  const schema = input.schema || {};

  // Load the prompt template
  const promptPath = path.join(__dirname, 'prompts', 'extract.prompt');
  let promptTemplate = '';
  try {
    promptTemplate = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    // Fallback template
    promptTemplate = `Extract information from the text based on the schema.
Return ONLY valid JSON matching the schema: {{schema}}

Text:
{{text}}`;
  }

  const schemaString = JSON.stringify(schema, null, 2);
  const prompt = promptTemplate
    .replace('{{schema}}', schemaString)
    .replace('{{text}}', text);

  // Call the model provider
  const modelProvider = context.services.getModelProvider();
  const rawOutput = await modelProvider.generate(prompt);

  // Parse and validate safely
  let success = true;
  let parsed = {};
  const cleaned = cleanJsonString(rawOutput);

  try {
    parsed = JSON.parse(cleaned);
  } catch (e: any) {
    success = false;
    context.services.getLogger().warn(`Failed to parse extracted JSON output: ${e.message}`, { rawOutput, cleaned });
    parsed = {};
  }

  // Normalize / enforce schema
  const data = enforceSchema(parsed, schema);

  return { data, raw: rawOutput, success };
}
