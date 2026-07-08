# Patient Timeline Builder Examples

Example structured input:

```json
{
  "patientId": "P-1001",
  "patientRecord": {
    "encounters": [
      { "date": "2024-08-22", "type": "Follow-up", "notes": "A1C 7.1%." },
      { "date": "2024-02-10", "type": "Annual physical", "notes": "A1C 7.8%." }
    ]
  }
}
```

Example raw-text input (routed through the existing `extract` Skill first):

```json
{
  "patientId": "P-1001",
  "patientRecord": "2024-02-10: Annual physical, A1C 7.8%, BP 138/88. 2024-08-22: Follow-up, A1C 7.1%, BP 130/82."
}
```

Example output shape:

```json
{
  "patientId": "P-1001",
  "timeline": {
    "timeline": [ { "date": "2024-02-10", "daysSincePrevious": null, "dateValid": true }, { "date": "2024-08-22", "daysSincePrevious": 194, "dateValid": true } ],
    "firstEncounterDate": "2024-02-10T00:00:00.000Z",
    "lastEncounterDate": "2024-08-22T00:00:00.000Z",
    "totalEncounters": 2,
    "averageGapDays": 194,
    "unorderedOrInvalidDateCount": 0
  },
  "narrative": "...",
  "disclaimer": "This timeline is AI-generated decision support and must be reviewed by a licensed clinician before use in patient care."
}
```
