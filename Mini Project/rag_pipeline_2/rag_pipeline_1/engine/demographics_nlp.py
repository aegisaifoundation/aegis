import re
import nltk
from nltk import word_tokenize, pos_tag, ne_chunk


class DemographicsExtractorNLP:
    """
    Hybrid demographics extractor:
    1. Regex (authoritative)
    2. NLP fallback (safe-guarded)
    """

    def extract(self, text: str) -> dict:
        data = {
            "patient_name": None,
            "age": None,
            "gender": "unknown",
            "report_date": None
        }

        # -------- STRONG RULE-BASED FIRST --------
        self._extract_name_regex(text, data)
        self._extract_age_gender(text, data)
        self._extract_date(text, data)

        # -------- NLP FALLBACK (ONLY IF NEEDED) --------
        if not data["patient_name"]:
            self._extract_name_nlp(text, data)

        return data

    # ------------------------------------------------
    # NAME (REGEX — AUTHORITATIVE)
    # ------------------------------------------------
    def _extract_name_regex(self, text, data):
        # Try multiple patterns to handle different formats
        patterns = [
            # Pattern for pipe-separated tables: | Patient Name | RAMESH KUMAR | ...
            r"Patient Name\s*\|\s*([A-Z][A-Z\s]+?)(?:\s*\||\s+$)",
            # Pattern without pipes: Patient Name    RAMESH KUMAR
            r"Patient Name\s+([A-Z][A-Z\s]+?)(?:\s+[A-Z]|$)",
            # General pattern
            r"Patient Name\s+([A-Z][A-Z\s]{3,})"
        ]
        
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                name = m.group(1).strip()
                # Clean up any pipe characters or extra whitespace
                name = re.sub(r'[|\n\r\t]+', ' ', name).strip()
                data["patient_name"] = name.title()
                return

    # ------------------------------------------------
    # AGE & GENDER
    # ------------------------------------------------
    def _extract_age_gender(self, text, data):
        m = re.search(
            r"Age\s*/\s*Sex\s+(\d+)\s*[Yy]?\s*/\s*(Male|Female|M|F)",
            text,
            re.IGNORECASE
        )
        if m:
            data["age"] = int(m.group(1))
            sex = m.group(2).lower()
            data["gender"] = "male" if sex.startswith("m") else "female"

    # ------------------------------------------------
    # DATE
    # ------------------------------------------------
    def _extract_date(self, text, data):
        # Look for the Registered On date specifically
        m = re.search(r"Registered On\s+\|\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})", text)
        if m:
            data["report_date"] = m.group(1)
        else:
            # Fallback to any date
            m = re.search(r"\d{1,2}\s+[A-Za-z]{3}\s+\d{4}", text)
            if m:
                data["report_date"] = m.group(0)

    # ------------------------------------------------
    # NAME (NLP FALLBACK — GUARDED)
    # ------------------------------------------------
    def _extract_name_nlp(self, text, data):
        candidates = []

        for line in text.split("\n"):
            if "patient" not in line.lower():
                continue

            tokens = word_tokenize(line)
            tagged = pos_tag(tokens)
            tree = ne_chunk(tagged)

            for subtree in tree:
                if hasattr(subtree, "label") and subtree.label() == "PERSON":
                    name = " ".join(w for w, _ in subtree.leaves())

                    # 🚫 HARD BLOCK BAD NAMES
                    if name.lower() in {"patient", "name"}:
                        continue

                    # require at least 2 words
                    if len(name.split()) < 2:
                        continue

                    candidates.append(name)

        if candidates:
            data["patient_name"] = max(candidates, key=len)