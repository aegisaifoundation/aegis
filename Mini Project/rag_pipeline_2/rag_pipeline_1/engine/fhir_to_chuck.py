import json
from rag_pipeline_1.engine.fhir import build_fhir_from_pdf


def fhir_to_chunks(bundle_json):
    bundle = json.loads(bundle_json)
    chunks = []

    for entry in bundle["entry"]:
        res = entry["resource"]

        # if res["resourceType"] == "Patient":
            #chunks.append(f"Patient Name: {res['name'][0]['text']}")
            #chunks.append(f"Gender: {res.get('gender','unknown')}")

        if res["resourceType"] == "Observation":
            chunks.append(
                f"{res['code']['text']} = {res['valueQuantity']['value']} {res['valueQuantity']['unit']}"
            )

        elif res["resourceType"] == "DiagnosticReport":
            chunks.append(f"Report Type: {res['code']['text']}")

    return chunks

def result(file_path: str):
	bundle_json = build_fhir_from_pdf(rf"{file_path}")
	chunks = fhir_to_chunks(bundle_json)
	return chunks

if __name__ == "__main__":
	print(result(r"C:\projects\Mini Project\rag_pipeline_2\rag_pipeline_1\documents\report.pdf"))