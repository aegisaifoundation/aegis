import json
import re
from datetime import datetime

from rag_pipeline_1.engine.pdf_to_ocr import ocr_pdf
from rag_pipeline_1.engine.MedicalReportCleaner import MedicalReportCleaner
from rag_pipeline_1.engine.stucturing import LabResultParser


# ---------------- PATIENT EXTRACTION ----------------
def extract_patient(text: str):
    details = {
        "name": "UNKNOWN",
        "age": None,
        "gender": "unknown"
    }

    m = re.search(r"Patient Name\s+([A-Z][A-Z ]+)", text, re.I)
    if m:
        details["name"] = m.group(1).title().strip()

    m = re.search(
        r"Age\s*/\s*Sex\s+(\d+)\s*[Yy]?\s*/\s*(Male|Female|M|F)",
        text,
        re.I
    )
    if m:
        details["age"] = int(m.group(1))
        sex = m.group(2).lower()
        details["gender"] = "male" if sex.startswith("m") else "female"

    return details


# ---------------- FHIR BUILDERS ----------------
def make_patient(p):
    return {
        "resourceType": "Patient",
        "id": "patient-1",
        "name": [{"text": p["name"]}],
        "gender": p["gender"]
    }


def make_observation(test, index):
    obs = {
        "resourceType": "Observation",
        "id": f"obs-{index}",
        "status": "final",
        "category": [{
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                "code": "laboratory"
            }]
        }],
        "code": {"text": test["test"]},
        "subject": {"reference": "Patient/patient-1"},
        "effectiveDateTime": datetime.now().isoformat(),
        "valueQuantity": {
            "value": test["value"],
            "unit": test["unit"]
        }
    }

    ref = {}
    if test["ref_low"] is not None:
        ref["low"] = {"value": test["ref_low"]}
    if test["ref_high"] is not None:
        ref["high"] = {"value": test["ref_high"]}

    if ref:
        obs["referenceRange"] = [ref]

    interp = {"low": "L", "high": "H", "normal": "N"}[test["status"]]
    obs["interpretation"] = [{
        "coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
            "code": interp
        }]
    }]

    return obs


# ---------------- PIPELINE ----------------
def build_fhir_from_pdf(pdf_path: str):
    raw = ocr_pdf(pdf_path)

    cleaner = MedicalReportCleaner()
    cleaned = cleaner.clean(raw)

    patient_info = extract_patient(cleaned)
    tests = LabResultParser().parse(cleaned)

    bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [{"resource": make_patient(patient_info)}]
    }

    observations = []
    for i, t in enumerate(tests):
        obs = make_observation(t, i)
        observations.append(obs)
        bundle["entry"].append({"resource": obs})

    bundle["entry"].append({
        "resource": {
            "resourceType": "DiagnosticReport",
            "id": "report-1",
            "status": "final",
            "code": {"text": "Laboratory Report"},
            "subject": {"reference": "Patient/patient-1"},
            "result": [{"reference": f"Observation/{o['id']}"} for o in observations]
        }
    })

    return json.dumps(bundle, indent=2)


if __name__ == "__main__":
    print(build_fhir_from_pdf(r"C:\projects\Mini Project\rag_pipeline_2\rag_pipeline_1\documents\report.pdf"))
