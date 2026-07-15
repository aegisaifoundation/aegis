export class CollectiveMemory {
    knowledgeStore = new Map(); // id -> version history
    experienceStore = new Map();
    storeKnowledge(obj) {
        let history = this.knowledgeStore.get(obj.id);
        if (!history) {
            history = [];
            this.knowledgeStore.set(obj.id, history);
        }
        history.push(obj);
        console.log(`[CollectiveMemory] Cached knowledge object ${obj.id} version ${obj.version}`);
    }
    storeExperience(exp) {
        this.experienceStore.set(exp.id, exp);
    }
    getLatestKnowledge(id) {
        const history = this.knowledgeStore.get(id);
        return history ? history[history.length - 1] : undefined;
    }
    searchKnowledge(domain, category) {
        const results = [];
        for (const history of this.knowledgeStore.values()) {
            const latest = history[history.length - 1];
            if (domain && latest.domain !== domain)
                continue;
            if (category && latest.category !== category)
                continue;
            results.push(latest);
        }
        return results;
    }
    listExperiences() {
        return Array.from(this.experienceStore.values());
    }
}
