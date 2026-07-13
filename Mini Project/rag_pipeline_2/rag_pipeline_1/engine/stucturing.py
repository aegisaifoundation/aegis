import re


class LabResultParser:
    """
    Extracts ONLY true laboratory values.
    """

    TEST_PATTERN = re.compile(
        r"""
        (?P<name>[A-Za-z0-9 ,()./%\-]+?)\s+
        (?P<value>\d+(\.\d+)?)\s*
        (?:
            (?P<range>(?P<low>\d+(\.\d+)?)\s*-\s*(?P<high>\d+(\.\d+)?))
            |
            (?P<lt><\s*(?P<lt_val>\d+(\.\d+)?))
            |
            (?P<gt>>\s*(?P<gt_val>\d+(\.\d+)?))
        )?
        \s*(?P<unit>[A-Za-z/%μu/]+)
        """,
        re.VERBOSE
    )

    VALID_UNITS = {
        "mg/dl", "g/dl", "u/l", "%", "mm/hr",
        "thou/ul", "fl", "mg/g", "thou/μl"
    }

    def parse(self, text: str):
        results = []

        for line in text.split("\n"):
            # Skip lines that are clearly headers
            if line.startswith("#") or "Test Parameter" in line or "Value" in line:
                continue
                
            m = self.TEST_PATTERN.match(line.strip())
            if not m:
                continue

            g = m.groupdict()
            unit = g["unit"].lower().replace("μ", "u")

            # 🚫 HARD BLOCK non-lab junk
            if unit not in self.VALID_UNITS:
                continue

            value = float(g["value"])
            low = float(g["low"]) if g["low"] else None
            high = float(g["high"]) if g["high"] else None

            if g["lt_val"]:
                high = float(g["lt_val"])
                low = None
            if g["gt_val"]:
                low = float(g["gt_val"])
                high = None

            status = self._flag(value, low, high)

            results.append({
                "test": g["name"].strip(),
                "value": value,
                "unit": g["unit"],
                "ref_low": low,
                "ref_high": high,
                "status": status
            })

        return results

    def _flag(self, value, low, high):
        if low is not None and value < low:
            return "low"
        if high is not None and value > high:
            return "high"
        return "normal"