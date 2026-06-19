import requests
import argparse

parser = argparse.ArgumentParser()

parser.add_argument(
"--report",
required = True,
help = "path to the medical report"
)

args = parser.parse_args()

url = "http://127.0.0.1:8000/ocr"
params = {"file_path": args.report}

r = requests.get(url, params = params)
print(r.json())
