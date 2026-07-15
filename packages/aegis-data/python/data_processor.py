import sys
import json
import re
import hashlib
import unicodedata
import traceback

# Optional imports for advanced parsing
try:
    import pypdf
except ImportError:
    pypdf = None

class DataProcessor:
    def __init__(self):
        # Compiled Regexes for PII (case-insensitive)
        self.email_re = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', re.IGNORECASE)
        self.phone_re = re.compile(r'\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}', re.IGNORECASE)
        self.ip_re = re.compile(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', re.IGNORECASE)
        self.ssn_gov_id_re = re.compile(r'\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b', re.IGNORECASE) # Gov IDs
        self.credit_card_re = re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', re.IGNORECASE) # Financial IDs
        self.hospital_id_re = re.compile(r'\bHOSP-\d{5,8}\b|\bMRN-\d{6,10}\b', re.IGNORECASE) # Hospital IDs / Patient MRNs
        
        # Simple Name matcher (for illustration, basic heuristics)
        self.name_indicators = [
            r'\b(?:dr\.|mr\.|ms\.|mrs\.|prof\.)\s+[a-z]+(?:\s+[a-z]+)?\b',
            r'\b(?:john|jane|alice|bob|charlie|david|emma|frank|grace|henry|ivy|jack)\s+[a-z]+\b'
        ]
        self.name_res = [re.compile(ind, re.IGNORECASE) for ind in self.name_indicators]

    def clean(self, text):
        if not text:
            return ""
        # Remove control characters, normalize whitespace, clean markdown tags
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        # Basic markdown cleaning
        text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
        text = re.sub(r'\*([^*]+)\*', r'\1', text)
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        return text

    def normalize(self, text):
        if not text:
            return ""
        # Unicode NFC normalization and lowercasing
        normalized = unicodedata.normalize('NFC', text)
        return normalized.lower()

    def lang_detect(self, text):
        if not text:
            return "unknown"
        # Heuristics for language detection
        # Counts common stop-words for English, Spanish, German, French
        words = re.findall(r'\b\w+\b', text.lower())
        if not words:
            return "english" # Default
        
        scores = {
            "english": len([w for w in words if w in {"the", "and", "is", "of", "to", "in", "it", "you", "that"}]),
            "spanish": len([w for w in words if w in {"el", "la", "los", "y", "en", "que", "un", "una", "del", "es"}]),
            "french": len([w for w in words if w in {"le", "la", "les", "et", "en", "que", "un", "une", "dans", "est"}]),
            "german": len([w for w in words if w in {"der", "die", "das", "und", "ist", "in", "zu", "den", "von", "mit"}])
        }
        max_lang = max(scores, key=scores.get)
        if scores[max_lang] == 0:
            return "english" # Default fallback
        return max_lang

    def deduplicate(self, text):
        if not text:
            return "0"
        # MD5 digest of normalized text for exact matching
        normalized = self.normalize(text)
        return hashlib.md5(normalized.encode('utf-8')).hexdigest()

    def pii_detect(self, text, custom_rules=None):
        if not text:
            return []
        
        findings = []
        
        # Email
        for m in self.email_re.finditer(text):
            findings.append({"type": "Email", "value": m.group(), "start": m.start(), "end": m.end()})
            
        # Phone
        for m in self.phone_re.finditer(text):
            if len(m.group().replace('-', '').replace(' ', '').replace('(', '').replace(')', '')) >= 7:
                findings.append({"type": "Phone Number", "value": m.group(), "start": m.start(), "end": m.end()})
                
        # SSN / Gov IDs
        for m in self.ssn_gov_id_re.finditer(text):
            findings.append({"type": "Government ID", "value": m.group(), "start": m.start(), "end": m.end()})
            
        # Credit Card / Financial IDs
        for m in self.credit_card_re.finditer(text):
            findings.append({"type": "Financial ID", "value": m.group(), "start": m.start(), "end": m.end()})
            
        # Hospital ID
        for m in self.hospital_id_re.finditer(text):
            findings.append({"type": "Hospital ID", "value": m.group(), "start": m.start(), "end": m.end()})

        # Name Heuristics
        for name_re in self.name_res:
            for m in name_re.finditer(text):
                findings.append({"type": "Name", "value": m.group(), "start": m.start(), "end": m.end()})

        # Custom rules (expects list of regex patterns)
        if custom_rules:
            for rule in custom_rules:
                try:
                    pattern = re.compile(rule.get("pattern"))
                    rule_type = rule.get("name", "Custom")
                    for m in pattern.finditer(text):
                        findings.append({"type": rule_type, "value": m.group(), "start": m.start(), "end": m.end()})
                except Exception:
                    pass

        return findings

    def chunk(self, text, chunk_size=200, chunk_overlap=50):
        if not text:
            return []
        # Paragraph or sentence-based chunking
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk_words = words[i:i+chunk_size]
            chunks.append(" ".join(chunk_words))
            i += (chunk_size - chunk_overlap)
            if i <= 0 or chunk_size <= chunk_overlap:
                break # Avoid infinite loop
        return chunks

    def tokenize(self, text):
        if not text:
            return []
        # GPT-2/3 tokenization simulation using whitespace, punctuation, and byte-pair subwords
        # Returns simple numerical ids based on hash of tokens for mock tokenization
        tokens = re.findall(r'\w+|[^\w\s]', text, re.UNICODE)
        # Mock token IDs mapping token string -> deterministic int in [0, 50257)
        token_ids = [(abs(hash(t)) % 50257) for t in tokens]
        return token_ids

    def statistics(self, text):
        if not text:
            return {
                "characters": 0,
                "words": 0,
                "sentences": 0,
                "paragraphs": 0,
                "avg_word_length": 0
            }
        chars = len(text)
        words = len(text.split())
        sentences = len(re.split(r'[.!?]+', text)) - 1
        sentences = max(1, sentences)
        paragraphs = len([p for p in text.split('\n\n') if p.strip()])
        paragraphs = max(1, paragraphs)
        avg_word = chars / words if words > 0 else 0
        return {
            "characters": chars,
            "words": words,
            "sentences": sentences,
            "paragraphs": paragraphs,
            "avg_word_length": avg_word
        }

    def parse_pdf(self, file_path):
        if pypdf:
            try:
                reader = pypdf.PdfReader(file_path)
                text = ""
                for page in reader.pages:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
                return text
            except Exception as e:
                return f"[PDF Parsing Error: {str(e)}]"
        else:
            # Fallback mock
            return f"[Mock PDF Extraction of {file_path}] Lorem ipsum dolor sit amet."

    def ocr_parse(self, file_path):
        # Simulates OCR engine text extraction
        return f"[Mock OCR Text from {file_path}] Approved Clinical Report ID HOSP-99230."

    def audio_transcribe(self, file_path):
        # Simulates Whisper transcription
        return f"[Mock Transcribed Audio from {file_path}] Patient states they are feeling better."


def main():
    processor = DataProcessor()
    # Output ready signal
    sys.stdout.write("AEGIS_DATA_READY\n")
    sys.stdout.flush()

    while True:
        line = sys.stdin.readline()
        if not line:
            break
        
        try:
            request = json.loads(line.strip())
            message_id = request.get("messageId")
            payload = request.get("payload", {})
            action = payload.get("action")
            data = payload.get("data")
            
            result = None
            
            if action == "clean":
                result = processor.clean(data)
            elif action == "normalize":
                result = processor.normalize(data)
            elif action == "lang_detect":
                result = processor.lang_detect(data)
            elif action == "deduplicate":
                result = processor.deduplicate(data)
            elif action == "pii_detect":
                custom_rules = payload.get("customRules")
                result = processor.pii_detect(data, custom_rules)
            elif action == "chunk":
                size = payload.get("chunkSize", 200)
                overlap = payload.get("chunkOverlap", 50)
                result = processor.chunk(data, size, overlap)
            elif action == "tokenize":
                result = processor.tokenize(data)
            elif action == "statistics":
                result = processor.statistics(data)
            elif action == "pdf_parse":
                result = processor.parse_pdf(data)
            elif action == "ocr_parse":
                result = processor.ocr_parse(data)
            elif action == "audio_transcribe":
                result = processor.audio_transcribe(data)
            else:
                raise ValueError(f"Unknown action: {action}")
            
            response = {
                "protocolVersion": "1.0.0",
                "messageType": "RESPONSE",
                "payload": {
                    "correlationId": message_id,
                    "data": result
                }
            }
        except Exception as e:
            response = {
                "protocolVersion": "1.0.0",
                "messageType": "RESPONSE",
                "payload": {
                    "correlationId": request.get("messageId") if 'request' in locals() else None,
                    "error": str(e),
                    "traceback": traceback.format_exc()
                }
            }
            
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()
