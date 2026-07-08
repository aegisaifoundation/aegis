/**
 * Canonical shapes used across all PatientDataTool actions.
 * Skills that consume this Tool should treat these as the contract
 * for patient record data flowing through the AEGIS runtime.
 */

export interface PatientEncounter {
  date: string | null;
  type?: string;
  notes?: string;
  diagnoses?: string[];
  medications?: string[];
  vitals?: Record<string, any>;
  raw?: any;
}

export interface PatientDemographics {
  name?: string;
  age?: number | string;
  sex?: string;
  dob?: string;
}

export interface NormalizedPatientRecord {
  patientId: string | null;
  demographics: PatientDemographics;
  encounters: PatientEncounter[];
  conditions: string[];
  medications: string[];
  allergies: string[];
  rawText: string | null;
}

export interface TimelineEntry extends PatientEncounter {
  daysSincePrevious: number | null;
  dateValid: boolean;
}

export interface TimelineResult {
  timeline: TimelineEntry[];
  firstEncounterDate: string | null;
  lastEncounterDate: string | null;
  totalEncounters: number;
  averageGapDays: number | null;
  unorderedOrInvalidDateCount: number;
}

export interface LatestEncounterResult {
  latestEncounter: PatientEncounter | null;
  daysSinceLastEncounter: number | null;
}
