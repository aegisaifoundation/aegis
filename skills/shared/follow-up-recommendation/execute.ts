import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SkillContext } from '@aegis/skills';
import type { ToolContext } from '@aegis/runtime';
import type { NormalizedPatientRecord, LatestEncounterResult } from '../../../tools/shared/PatientDataTool/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISCLAIMER = 'These follow-up recommendations are AI-generated decision support and must be reviewed and confirmed by a licensed clinician before use in patient care.';

function buildToolContext(context: SkillContext): ToolContext {
  return {
    workspacePath: context.services.getWorkspacePath(),
    sessionId: 'skill:follow-up-recommendation'
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

export interface FollowUpRecommendationInput {
  patientRecord: string | Record<string, any>;
  patientId?: string;
}

export interface FollowUpRecommendationOutput {
  patientId: string | null;
  summary: string;
  daysSinceLastEncounter: number | null;
  followUpRecommendation: string;
  disclaimer: string;
}

export default async function execute(input: any, context: SkillContext): Promise<FollowUpRecommendationOutput> {
  if (!input || (typeof input !== 'string' && typeof input !== 'object')) {
    throw new Error('Input must be a string (raw clinical text) or an object with a "patientRecord" field.');
  }

  const patientRecord = typeof input === 'string' ? input : (input.patientRecord ?? input);
  const patientId = (typeof input === 'object' && input.patientId) || undefined;

  // Reuse the patient-history-summarizer Skill rather than re-implementing
  // summarization logic here.
  const skillRegistry = context.services.getSkillRegistry();
  const summaryResult = await skillRegistry.executeSkill('patient-history-summarizer', { patientRecord, patientId });

  // Deterministic gap analysis via the shared PatientDataTool.
  const normalized: NormalizedPatientRecord = await callTool('normalize', { patientRecord }, context);
  const latest: LatestEncounterResult = await callTool('getLatestEncounter', { encounters: normalized.encounters }, context);

  const promptPath = path.join(__dirname, 'prompts', 'follow-up.prompt');
  let promptTemplate = '';
  try {
    promptTemplate = fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    promptTemplate = 'Recommend follow-up actions based on this summary:\n\n{{summary}}\n\nDays since last encounter: {{daysSinceLastEncounter}}';
  }

  const prompt = promptTemplate
    .replace('{{summary}}', summaryResult.summary)
    .replace('{{daysSinceLastEncounter}}', String(latest.daysSinceLastEncounter ?? 'unknown'));

  const modelProvider = context.services.getModelProvider();
  const followUpRecommendation = (await modelProvider.generate(prompt)).trim();

  return {
    patientId: summaryResult.patientId || normalized.patientId || patientId || null,
    summary: summaryResult.summary,
    daysSinceLastEncounter: latest.daysSinceLastEncounter,
    followUpRecommendation,
    disclaimer: DISCLAIMER
  };
}
