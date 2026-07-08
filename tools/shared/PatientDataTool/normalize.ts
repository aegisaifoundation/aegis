import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';
import type { NormalizedPatientRecord, PatientEncounter } from './types.js';

function toStringArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.filter((v) => v !== null && v !== undefined).map((v) => String(v));
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return [value];
  }
  return [];
}

function normalizeEncounter(entry: any): PatientEncounter {
  if (typeof entry === 'string') {
    return { date: null, notes: entry };
  }
  const e = entry || {};
  return {
    date: e.date || e.visitDate || e.encounterDate || null,
    type: e.type || e.encounterType || undefined,
    notes: e.notes || e.summary || e.description || undefined,
    diagnoses: toStringArray(e.diagnoses || e.diagnosis),
    medications: toStringArray(e.medications || e.medication),
    vitals: typeof e.vitals === 'object' && e.vitals !== null ? e.vitals : undefined,
    raw: entry
  };
}

/**
 * Normalizes arbitrary patient record input (a raw string, or a partially
 * structured object) into the canonical NormalizedPatientRecord schema.
 *
 * This action is intentionally deterministic and does not call an LLM.
 * When the input is unstructured free text, the raw text is preserved in
 * `rawText` and `encounters` is left empty; Skills that need structured
 * encounters from free text should first run the raw text through the
 * existing `extract` Skill and pass the resulting object back in here.
 */
export default async function execute(input: any, _context: ToolContext): Promise<string> {
  let record: NormalizedPatientRecord;

  // Actions are invoked as { action: 'normalize', patientRecord: <string|object> }.
  // Unwrap patientRecord when present so this action also works if a caller
  // passes the raw record directly as `input`.
  const source = (input && typeof input === 'object' && 'patientRecord' in input)
    ? input.patientRecord
    : input;

  if (typeof source === 'string') {
    record = {
      patientId: null,
      demographics: {},
      encounters: [],
      conditions: [],
      medications: [],
      allergies: [],
      rawText: source
    };
  } else if (source && typeof source === 'object') {
    const data = source;

    const encountersRaw = data.encounters || data.visits || data.history || [];
    const encounters = Array.isArray(encountersRaw)
      ? encountersRaw.map(normalizeEncounter)
      : [];

    record = {
      patientId: data.patientId || data.id || null,
      demographics: {
        name: data.demographics?.name || data.name,
        age: data.demographics?.age || data.age,
        sex: data.demographics?.sex || data.sex,
        dob: data.demographics?.dob || data.dob
      },
      encounters,
      conditions: toStringArray(data.conditions),
      medications: toStringArray(data.medications),
      allergies: toStringArray(data.allergies),
      rawText: typeof data.rawText === 'string' ? data.rawText
        : (typeof data.text === 'string' ? data.text : null)
    };
  } else {
    throw new Error('Input must be a raw text string or a patient record object.');
  }

  return JSON.stringify(record);
}
