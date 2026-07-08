# Lifestyle Recommendation Examples

Example input:

```json
{
  "patientId": "P-1001",
  "patientRecord": {
    "conditions": ["Type 2 diabetes", "Hypertension"],
    "medications": ["Metformin 500mg", "Lisinopril 10mg"],
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
  "lifestyleRecommendation": "Diet and nutrition considerations: ...",
  "disclaimer": "This lifestyle guidance is AI-generated decision support and must be reviewed, tailored, and confirmed by a licensed clinician before being discussed with the patient."
}
```

Note: this Skill depends on `patient-history-summarizer` and `PatientDataTool` being loaded and active.
