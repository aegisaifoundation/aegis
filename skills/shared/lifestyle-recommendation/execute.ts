import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SkillContext } from '@aegis/skills';
import type { ToolContext } from '@aegis/runtime';
import type { NormalizedPatientRecord } from '../../../tools/shared/PatientDataTool/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISCLAIMER = 'This lifestyle guidance is AI-generated decision support and must be reviewed, tailored, and confirmed by a licensed clinician before being discussed with the patient.';

function buildToolContext(context: SkillContext): ToolContext {
  return {
    workspacePath: context.services.getWorkspacePath(),
    sessionId: 'skill:lifestyle-recommendation'
  };
}

async function normalizeRecord(patientRecord: any, context: SkillContext): Promise<NormalizedPatientRecord> {
  const toolRegistry = context.services.getToolRegistry();
  const tool = toolRegistry.getTool('PatientDataTool');
  if (!tool) {
    throw new Error('PatientDataTool is not registered. Load it with: /add tool shared/PatientDataTool');
  }
  const raw = await tool.execute(
    JSON.stringify({ action: 'normalize', patientRecord }),
    buildToolContext(context)
  );
  return JSON.parse(raw);
}

export interface LifestyleRecommendationInput {
  patientRecord: string | Record<string, any>;
  patientId?: string;
}

export interface LifestyleRecommendationOutput {
  patientId: string | null;
  summary: string;
  lifestyleRecommendation: string;
  disclaimer: string;
}

export default async function execute(input: any, context: SkillContext): Promise<LifestyleRecommendationOutput> {
  if (!input || (typeof input !== 'string' && typeof input !== 'object')) {
    throw new Error('Input must be a string (raw clinical text) or an object with a "patientRecord" field.');
  }

  const patientRecord = typeof input === 'string' ? input : (input.patientRecord ?? input);
  const patientId = (typeof input === 'object' && input.patientId) || undefined;

  // Reuse the patient-history-summarizer Skill rather than re-implementing
  // summarization logic here.
  const skillRegistry = context.services.getSkillRegistry();
  const summaryResult = await skillRegistry.executeSkill('patient-history-summarizer', { patientRecord, patientId });

  const normalized = await normalizeRecord(patientRecord, context);

  const promptPath = path.join(__dirname, 'prompts', 'lifestyle.prompt');
  let promptTemplate = '';
  try {
    promptTemplate = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    promptTemplate = 'Provide lifestyle guidance based on this summary:\n\n{{summary}}\n\nConditions: {{conditions}}\nMedications: {{medications}}';
  }

  const prompt = promptTemplate
    .replace('{{summary}}', summaryResult.summary)
    .replace('{{conditions}}', normalized.conditions.length > 0 ? normalized.conditions.join(', ') : 'none listed')
    .replace('{{medications}}', normalized.medications.length > 0 ? normalized.medications.join(', ') : 'none listed');

  const modelProvider = context.services.getModelProvider();
  const lifestyleRecommendation = (await modelProvider.generate(prompt)).trim();

  return {
    patientId: summaryResult.patientId || normalized.patientId || patientId || null,
    summary: summaryResult.summary,
    lifestyleRecommendation,
    disclaimer: DISCLAIMER
  };
}
