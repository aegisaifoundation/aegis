import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SkillContext } from '../../../aegis-core/src/skills/SkillContext.js';
import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';
import type { NormalizedPatientRecord } from '../../../tools/shared/PatientDataTool/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISCLAIMER = 'This summary is AI-generated decision support and must be reviewed by a licensed clinician before use in patient care.';

function buildToolContext(context: SkillContext): ToolContext {
  return {
    workspacePath: context.services.getWorkspacePath(),
    sessionId: 'skill:patient-history-summarizer'
  };
}

/**
 * Normalizes the raw patientRecord input via the shared PatientDataTool.
 */
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

export interface PatientHistorySummarizerInput {
  patientRecord: string | Record<string, any>;
  patientId?: string;
}

export interface PatientHistorySummarizerOutput {
  patientId: string | null;
  summary: string;
  disclaimer: string;
}

export default async function execute(input: any, context: SkillContext): Promise<PatientHistorySummarizerOutput> {
  if (!input || (typeof input !== 'string' && typeof input !== 'object')) {
    throw new Error('Input must be a string (raw clinical text) or an object with a "patientRecord" field.');
  }

  const patientRecord = typeof input === 'string' ? input : (input.patientRecord ?? input);
  if (patientRecord === undefined || patientRecord === null) {
    throw new Error('Input must include a "patientRecord" field (string or object).');
  }

  const normalized = await normalizeRecord(patientRecord, context);

  // Prefer the structured record for the prompt; fall back to raw text when
  // no structured fields were present (e.g. free-form clinical notes).
  const hasStructuredData =
    normalized.encounters.length > 0 ||
    normalized.conditions.length > 0 ||
    normalized.medications.length > 0 ||
    normalized.allergies.length > 0;

  const recordForPrompt = hasStructuredData || !normalized.rawText
    ? JSON.stringify(normalized, null, 2)
    : normalized.rawText;

  const promptPath = path.join(__dirname, 'prompts', 'summarize-history.prompt');
  let promptTemplate = '';
  try {
    promptTemplate = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    promptTemplate = 'Summarize the following patient record:\n\n{{record}}';
  }

  const prompt = promptTemplate.replace('{{record}}', recordForPrompt);

  const modelProvider = context.services.getModelProvider();
  const summary = await modelProvider.generate(prompt);

  const patientId = (typeof input === 'object' && input.patientId) || normalized.patientId || null;

  return {
    patientId,
    summary: summary.trim(),
    disclaimer: DISCLAIMER
  };
}
