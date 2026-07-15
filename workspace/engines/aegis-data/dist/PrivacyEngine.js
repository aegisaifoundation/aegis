export class PrivacyEngine {
    pythonManager;
    customRules = [];
    constructor(pythonManager) {
        this.pythonManager = pythonManager;
    }
    addCustomRule(rule) {
        this.customRules.push(rule);
    }
    getCustomRules() {
        return this.customRules;
    }
    async detectPII(text) {
        if (!text)
            return [];
        try {
            const findings = await this.pythonManager.request('pii_detect', text, {
                customRules: this.customRules
            });
            return findings || [];
        }
        catch (err) {
            // Fallback: simple TypeScript regex if Python fails
            return this.detectPIIFallback(text);
        }
    }
    async redact(text) {
        if (!text)
            return "";
        const findings = await this.detectPII(text);
        if (findings.length === 0)
            return text;
        // Sort findings descending by start index to redact from end to start without throwing off offsets
        const sorted = [...findings].sort((a, b) => b.start - a.start);
        let redacted = text;
        for (const item of sorted) {
            const placeholder = `[REDACTED_${item.type.toUpperCase().replace(/\s+/g, '_')}]`;
            redacted = redacted.substring(0, item.start) + placeholder + redacted.substring(item.end);
        }
        return redacted;
    }
    detectPIIFallback(text) {
        const findings = [];
        const emailRe = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
        const phoneRe = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
        let m;
        while ((m = emailRe.exec(text)) !== null) {
            findings.push({ type: 'Email', value: m[0], start: m.index, end: m.index + m[0].length });
        }
        while ((m = phoneRe.exec(text)) !== null) {
            findings.push({ type: 'Phone Number', value: m[0], start: m.index, end: m.index + m[0].length });
        }
        // Apply custom rules if present
        for (const rule of this.customRules) {
            try {
                const re = new RegExp(rule.pattern, 'g');
                while ((m = re.exec(text)) !== null) {
                    findings.push({ type: rule.name, value: m[0], start: m.index, end: m.index + m[0].length });
                }
            }
            catch { }
        }
        return findings;
    }
}
