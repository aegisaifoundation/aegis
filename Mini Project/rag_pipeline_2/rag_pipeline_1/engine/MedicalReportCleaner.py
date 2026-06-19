import re


class MedicalReportCleaner:
    """
    Cleans OCR medical reports while preserving clinical meaning.
    """

    def clean(self, text: str) -> str:
        text = self._normalize(text)
        text = self._fix_ocr_artifacts(text)
        text = self._remove_noise(text)
        text = self._merge_wrapped_lines(text)
        return text.strip()

    def _normalize(self, text):
        text = text.replace("\r", "\n")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{2,}", "\n", text)
        return text

    def _fix_ocr_artifacts(self, text):
        fixes = {
            "µ": "u",
            "–": "-",
            "—": "-",
            "< ": "<",
            " >": ">",
            "mg / dL": "mg/dL",
            "mm / hr": "mm/hr",
            "g / dL": "g/dL",
            "thou / uL": "thou/uL",
            "mg / g": "mg/g"
        }
        for k, v in fixes.items():
            text = text.replace(k, v)
        return text

    def _remove_noise(self, text):
        blacklist = [
            r"Strictly Confidential",
            r"Electronic Signature",
            r"Accreditation",
            r"Reg No",
            r"END OF",
            r"Senior Pathologist",
            r"Dr\.",
            r"Signature",
            r"Clinical Interpretation",
            r"Clinical Notes",
            r"Flagged Alerts",
            r"Nephropathy Alert",
            r"Occupational Note",
            r"Inflammation:"
        ]

        cleaned = []
        for line in text.split("\n"):
            line = line.strip()
            if not line:
                continue
            if any(re.search(b, line, re.IGNORECASE) for b in blacklist):
                continue
            cleaned.append(line)

        return "\n".join(cleaned)

    def _merge_wrapped_lines(self, text):
        merged = []
        buffer = ""

        for line in text.split("\n"):
            if len(line) < 30 and not re.search(r"\d", line):
                buffer += " " + line
            else:
                if buffer:
                    merged.append(buffer.strip())
                    buffer = ""
                merged.append(line)

        if buffer:
            merged.append(buffer.strip())

        return "\n".join(merged)