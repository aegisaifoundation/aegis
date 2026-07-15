# Phase 5: AEGIS Data Engine (ADE) Specification

The AEGIS Data Engine is responsible for local data harvesting, parsing, cleaning, and preparation of custom training-ready datasets while ensuring complete privacy and user sovereignty.

---

## 1. Raw Data Scanning & Imports

- **Directory Importers**: Scans designated workspace folders for files (txt, csv, JSON, markdown).
- **Processing Queue**: Queues files for validation.

---

## 2. Privacy Scrubber & PII Filters

Before files are indexed or structured, the Data Engine runs a strict regex and classification check to redact sensitive inputs:
*   **PII Masking**: Redacts phone numbers, physical addresses, names, and emails.
*   **Credentials Filter**: Automatically strips out API keys, tokens, SSH keys, and password patterns.
*   **Compliance Enforcer**: Checks the file against custom location privacy rules (e.g. blocking medical record export).

---

## 3. Dataset Validation & Schemas

The engine verifies that processed data matches clean, structured schemas required by training backends:
```json
{
  "datasetId": "ds-medical-ocr-v1",
  "samples": [
    {
      "instruction": "Parse clinical note details.",
      "input": "Patient reports mild headache...",
      "output": "{\"symptom\": \"headache\", \"severity\": \"mild\"}"
    }
  ]
}
```
Validation ensures no corrupted float arrays, malformed JSON, or missing output fields enter the learning pipeline.
