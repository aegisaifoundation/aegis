export class KnowledgeValidator {
    validateKnowledge(obj) {
        // 1. Signature Check
        if (!obj.signature) {
            console.warn(`[KnowledgeValidator] Rejected ${obj.id}: missing signature`);
            return false;
        }
        // 2. Confidence and Trust Thresholds
        if (obj.confidence < 0.5 || obj.trustScore < 0.5) {
            console.warn(`[KnowledgeValidator] Rejected ${obj.id}: low confidence/trust scores`);
            return false;
        }
        // 3. Evidence Check
        if (obj.evidenceCount <= 0) {
            console.warn(`[KnowledgeValidator] Rejected ${obj.id}: insufficient evidence support`);
            return false;
        }
        // 4. Privacy Check (Ensure no raw credit cards or API keys leaked in the distilled summary/reasoningPattern)
        if (this.containsSensitiveData(obj.summary) || obj.reasoningPattern.some(p => this.containsSensitiveData(p))) {
            console.warn(`[KnowledgeValidator] Rejected ${obj.id}: privacy leak detected`);
            return false;
        }
        console.log(`[KnowledgeValidator] Approved knowledge object: ${obj.id}`);
        return true;
    }
    containsSensitiveData(text) {
        const piiRegexes = [
            /\b(?:\d[ -]*?){13,16}\b/,
            /sk-[a-zA-Z0-9]{32,48}/
        ];
        return piiRegexes.some(r => r.test(text));
    }
}
