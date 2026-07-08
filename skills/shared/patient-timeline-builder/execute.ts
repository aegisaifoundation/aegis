import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SkillContext } from '../../../aegis-core/src/skills/SkillContext.js';
import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';
import type { NormalizedPatientRecord, TimelineResult } from '../../../tools/shared/PatientDataTool/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISCLAIMER = 'This timeline is AI-generated decision support and must be reviewed by a licensed clinician before use in patient care.';

const EXTRACTION_SCHEMA = {
  patientId: 'string',
  demographics: { name: 'string', age: 'string', sex: 'string' },
  encounters: 'array',
  conditions: 'array',
  medications: 'array',
  allergies: 'array'
};

function buildToolContext(context: SkillContext): ToolContext {
  return {
    workspacePath: context.services.getWorkspacePath(),
    sessionId: 'skill:patient-timeline-builder'
  };
}

async function callTool(action: string, payload: Record<string, any>, context: SkillContext): Promise<any> {
  const toolRegistry = context.services.getToolRegistry();
  const tool = toolRegistry.getTool('PatientDataTool');
  if (!tool) {
    throw new Error('PatientDataTool is not registered. Load it with: /add tool shared/PatientDataTool');
  }
  const raw = await tool.execute(JSON.stringify({ action, ...payload }), buildToolContext(context));
  return JSON.parse(raw);
}

/**
 * Reuses the existing `extract` Skill to turn unstructured clinical text
 * into structured encounter data before it is normalized and sorted.
 */
async function extractStructuredRecord(rawText: string, context: SkillContext): Promise<Record<string, any>> {
  const skillRegistry = context.services.getSkillRegistry();
  const extraction = await skillRegistry.executeSkill('extract', { text: rawText, schema: EXTRACTION_SCHEMA });
  return extraction?.data || {};
}

export interface PatientTimelineBuilderInput {
  patientRecord: string | Record<string, any>;
  patientId?: string;
}

export interface PatientTimelineBuilderOutput {
  patientId: string | null;
  timeline: TimelineResult;
  narrative: string;
  disclaimer: string;
}

export default async function execute(input: any, context: SkillContext): Promise<PatientTimelineBuilderOutput> {
  if (!input || (typeof input !== 'string' && typeof input !== 'object')) {
    throw new Error('Input must be a string (raw clinical text) or an object with a "patientRecord" field.');
  }

  const patientRecord = typeof input === 'string' ? input : (input.patientRecord ?? input);
  if (patientRecord === undefined || patientRecord === null) {
    throw new Error('Input must include a "patientRecord" field (string or object).');
  }

  let normalized: NormalizedPatientRecord = await callTool('normalize', { patientRecord }, context);

  // If normalization produced no structured encounters but we do have raw
  // text, run it through the `extract` Skill (if active) to structure it.
  if (normalized.encounters.length === 0 && normalized.rawText) {
    try {
      const extracted = await extractStructuredRecord(normalized.rawText, context);
      normalized = await callTool('normalize', { patientRecord: extracted }, context);
    } catch (err: any) {
      context.services.getLogger().warn(
        `patient-timeline-builder: could not extract structured encounters from raw text (${err.message}). Proceeding with an empty timeline.`
      );
    }
  }

  const timeline: TimelineResult = await callTool('buildTimeline', { encounters: normalized.encounters }, context);

  const promptPath = path.join(__dirname, 'prompts', 'narrate-timeline.prompt');
  let promptTemplate = '';
  try {
    promptTemplate = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    promptTemplate = 'Narrate the following patient timeline:\n\n{{timeline}}';
  }

  const prompt = promptTemplate.replace('{{timeline}}', JSON.stringify(timeline, null, 2));

  let narrative = '';
  if (timeline.totalEncounters > 0) {
    const modelProvider = context.services.getModelProvider();
    narrative = (await modelProvider.generate(prompt)).trim();
  } else {
    narrative = 'No dated encounters were available to construct a timeline narrative.';
  }

  const patientId = (typeof input === 'object' && input.patientId) || normalized.patientId || null;

  return {
    patientId,
    timeline,
    narrative,
    disclaimer: DISCLAIMER
  };
}
