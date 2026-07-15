export class ExpertiseManager {
    profiles = new Map();
    constructor() {
        // Populate default profiles
        const domains = [
            'medical', 'programming', 'research', 'finance', 'legal',
            'agriculture', 'education', 'vision', 'speech', 'robotics'
        ];
        for (const d of domains) {
            this.profiles.set(d, {
                domain: d,
                expertiseScore: 0.1,
                confidence: 0.2,
                experienceCount: 0,
                successRate: 0.0,
                trend: 'stable'
            });
        }
    }
    getProfile(domain) {
        let p = this.profiles.get(domain.toLowerCase());
        if (!p) {
            p = {
                domain: domain.toLowerCase(),
                expertiseScore: 0.1,
                confidence: 0.2,
                experienceCount: 0,
                successRate: 0.0,
                trend: 'stable'
            };
            this.profiles.set(domain.toLowerCase(), p);
        }
        return p;
    }
    recordTaskOutcome(domain, success) {
        const p = this.getProfile(domain);
        p.experienceCount++;
        const oldSuccessRate = p.successRate;
        p.successRate = success
            ? (p.successRate * 9 + 1) / 10
            : (p.successRate * 9) / 10;
        // Evolve expertise score and confidence
        p.expertiseScore = Math.min(1.0, p.expertiseScore + (success ? 0.05 : -0.02));
        p.confidence = Math.min(1.0, p.confidence + 0.05);
        p.trend = p.successRate > oldSuccessRate ? 'improving' : 'stable';
        console.log(`[ExpertiseManager] Domain [${domain}] outcome processed. Expertise score: ${p.expertiseScore.toFixed(3)}`);
    }
    listProfiles() {
        return Array.from(this.profiles.values());
    }
}
