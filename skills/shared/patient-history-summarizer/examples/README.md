# Patient History Summarizer Examples

Example input:

```json
{
  "patientId": "P-1001",
  "patientRecord": {
    "demographics": { "name": "Jane Doe", "age": 54, "sex": "female" },
    "conditions": ["Type 2 diabetes", "Hypertension"],
    "medications": ["Metformin 500mg", "Lisinopril 10mg"],
    "allergies": ["Penicillin"],
    "encounters": [
      { "date": "2024-02-10", "type": "Annual physical", "notes": "A1C 7.8%, BP 138/88." },
      { "date": "2024-08-22", "type": "Follow-up", "notes": "A1C 7.1%, BP 130/82. Medication adherence good." }
    ]
  }
}
```

Example output shape:

```json
{
  "patientId": "P-1001",
  "summary": "Chief Complaints / Reason for Care: ...",
  "disclaimer": "This summary is AI-generated decision support and must be reviewed by a licensed clinician before use in patient care."
}
```
