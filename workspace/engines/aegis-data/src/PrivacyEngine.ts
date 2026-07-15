import { PythonProcessManager } from './ipc/PythonProcessManager.js';

export interface PIIRule {
  name: string;
  pattern: string;
}

export class PrivacyEngine {
  private customRules: PIIRule[] = [];

  constructor(private pythonManager: PythonProcessManager) {}

  addCustomRule(rule: PIIRule): void {
    this.customRules.push(rule);
  }

  getCustomRules(): PIIRule[] {
    return this.customRules;
  }

  async detectPII(text: string): Promise<Array<{ type: string; value: string; start: number; end: number }>> {
    if (!text) return [];
    try {
      const findings = await this.pythonManager.request('pii_detect', text, {
        customRules: this.customRules
      });
      return findings || [];
    } catch (err) {
      // Fallback: simple TypeScript regex if Python fails
      return this.detectPIIFallback(text);
    }
  }

  async redact(text: string): Promise<string> {
    if (!text) return "";
    const findings = await this.detectPII(text);
    if (findings.length === 0) return text;

    // Sort findings descending by start index to redact from end to start without throwing off offsets
    const sorted = [...findings].sort((a, b) => b.start - a.start);
    let redacted = text;
    for (const item of sorted) {
      const placeholder = `[REDACTED_${item.type.toUpperCase().replace(/\s+/g, '_')}]`;
      redacted = redacted.substring(0, item.start) + placeholder + redacted.substring(item.end);
    }
    return redacted;
  }

  private detectPIIFallback(text: string): Array<{ type: string; value: string; start: number; end: number }> {
    const findings: Array<{ type: string; value: string; start: number; end: number }> = [];
    const emailRe = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
    const phoneRe = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

    let m: RegExpExecArray | null;
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
      } catch {}
    }

    return findings;
  }
}
