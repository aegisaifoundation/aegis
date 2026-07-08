# Follow-up Recommendation Examples

Example input:

```json
{
  "patientId": "P-1001",
  "patientRecord": {
    "conditions": ["Type 2 diabetes"],
    "medications": ["Metformin 500mg"],
    "encounters": [
      { "date": "2024-08-22", "type": "Follow-up", "notes": "A1C 7.1%, BP 130/82." }
    ]
  }
}
```

Example output shape:

```json
{
  "patientId": "P-1001",
  "summary": "...",
  "daysSinceLastEncounter": 320,
  "followUpRecommendation": "Suggested follow-up actions: ...",
  "disclaimer": "These follow-up recommendations are AI-generated decision support and must be reviewed and confirmed by a licensed clinician before use in patient care."
}
```

Note: this Skill depends on `patient-history-summarizer` and `PatientDataTool` being loaded and active.
