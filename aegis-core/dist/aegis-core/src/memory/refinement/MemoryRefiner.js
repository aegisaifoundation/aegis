export class MemoryRefiner {
    /**
     * Refines the session memory by extracting user goals, preferences, and facts,
     * deduplicating data, ranking importance, and enforcing size constraints.
     */
    async refineSessionMemory(sessionId, history, currentSessionMemory) {
        // 1. Extract new facts/goals from history
        const newFacts = [];
        for (const msg of history) {
            if (msg.role === 'user') {
                const lines = msg.content.split('\n');
                for (const line of lines) {
                    const l = line.trim().toLowerCase();
                    if (l.startsWith('remember') || l.includes('prefer') || l.includes('always') || l.includes('must not')) {
                        newFacts.push(line.trim());
                    }
                }
            }
        }
        // 2. Parse current session memory markdown
        const sections = this.parseMarkdownSections(currentSessionMemory);
        // Ensure default sections exist
        if (!sections['Goals'])
            sections['Goals'] = [];
        if (!sections['Preferences'])
            sections['Preferences'] = [];
        if (!sections['Stable Facts'])
            sections['Stable Facts'] = [];
        // Categorize and add newly extracted facts
        for (const fact of newFacts) {
            const factLower = fact.toLowerCase();
            if (factLower.includes('goal') || factLower.includes('objective')) {
                sections['Goals'].push(`- ${fact}`);
            }
            else if (factLower.includes('prefer') || factLower.includes('like')) {
                sections['Preferences'].push(`- ${fact}`);
            }
            else {
                sections['Stable Facts'].push(`- ${fact}`);
            }
        }
        // 3. Deduplicate lines in each section
        for (const title of Object.keys(sections)) {
            sections[title] = Array.from(new Set(sections[title]));
        }
        // 4. Reconstruct refined markdown content
        let refined = this.reconstructMarkdown(sections);
        // 5. Enforce word limit (<= 1000 words)
        refined = this.enforceWordLimit(refined, 1000);
        return refined;
    }
    /**
     * Refines working memory by pruning completed tasks, intermediate reasoning,
     * and stale execution state.
     */
    async refineWorkingMemory(sessionId, currentWorkingMemory) {
        if (!currentWorkingMemory)
            return '';
        // Check if it's using the new format (contains "- goal:" or "active task")
        const isNewFormat = currentWorkingMemory.includes('- goal:') || currentWorkingMemory.includes('active task');
        if (isNewFormat) {
            const lines = currentWorkingMemory.split('\n');
            const refinedLines = [];
            let inActiveTasks = false;
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('active task')) {
                    inActiveTasks = true;
                    refinedLines.push(line);
                    continue;
                }
                if (inActiveTasks) {
                    // If we hit a new section header
                    if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
                        inActiveTasks = false;
                    }
                    else {
                        const isCompleted = trimmed.includes('[✓]') || trimmed.includes('[✔]') || trimmed.includes('[x]') || trimmed.includes('[X]');
                        if (isCompleted) {
                            // Prune completed task
                            continue;
                        }
                    }
                }
                refinedLines.push(line);
            }
            let refined = refinedLines.join('\n');
            refined = this.enforceWordLimit(refined, 1500);
            return refined;
        }
        const sections = this.parseMarkdownSections(currentWorkingMemory);
        // Prune completed tasks [x] or expired workflows
        if (sections['Current Tasks']) {
            sections['Current Tasks'] = sections['Current Tasks'].filter(task => {
                const isCompleted = task.includes('[x]') || task.includes('[X]') || task.includes('[✓]') || task.includes('[✔]');
                return !isCompleted;
            });
        }
        if (sections['Intermediate Conclusions']) {
            // Remove stale reasoning by keeping only the last 5 conclusions
            sections['Intermediate Conclusions'] = sections['Intermediate Conclusions'].slice(-5);
        }
        if (sections['Temporary Execution Context']) {
            // Expire context elements
            sections['Temporary Execution Context'] = sections['Temporary Execution Context'].slice(-10);
        }
        // Reconstruct markdown
        let refined = this.reconstructMarkdown(sections);
        // Enforce word limit (<= 1500 words)
        refined = this.enforceWordLimit(refined, 1500);
        return refined;
    }
    /**
     * Helper to parse markdown into heading-based sections.
     */
    parseMarkdownSections(markdown) {
        const sections = {};
        if (!markdown)
            return sections;
        const lines = markdown.split('\n');
        let currentSection = 'General';
        sections[currentSection] = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
                currentSection = trimmed.replace(/^#+\s+/, '');
                sections[currentSection] = [];
            }
            else if (trimmed) {
                sections[currentSection].push(line);
            }
        }
        return sections;
    }
    /**
     * Helper to reconstruct sections back into formatted markdown.
     */
    reconstructMarkdown(sections) {
        let md = '';
        for (const [title, lines] of Object.entries(sections)) {
            if (lines.length === 0)
                continue;
            md += `## ${title}\n`;
            for (const line of lines) {
                md += `${line}\n`;
            }
            md += '\n';
        }
        return md.trim();
    }
    /**
     * Enforces word count limits strictly.
     */
    enforceWordLimit(text, limit) {
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length <= limit) {
            return text;
        }
        return words.slice(0, limit).join(' ') + '\n\n*System warning: Concluding content pruned to satisfy word count quota limits.*';
    }
    /**
     * Refines task memory by pruning completed tasks.
     */
    async refineTaskMemory(sessionId, currentTaskMemory) {
        if (!currentTaskMemory)
            return '';
        const lines = currentTaskMemory.split('\n');
        const refinedLines = [];
        let inActiveTasks = false;
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('# Active Tasks')) {
                inActiveTasks = true;
                refinedLines.push(line);
                continue;
            }
            if (inActiveTasks) {
                if (trimmed.startsWith('#')) {
                    inActiveTasks = false;
                }
                else {
                    const isCompleted = trimmed.includes('[✓]') || trimmed.includes('[✔]') || trimmed.includes('[x]') || trimmed.includes('[X]');
                    if (isCompleted) {
                        continue;
                    }
                }
            }
            else if (trimmed.startsWith('-')) {
                const isCompleted = trimmed.includes('[✓]') || trimmed.includes('[✔]') || trimmed.includes('[x]') || trimmed.includes('[X]');
                if (isCompleted) {
                    continue;
                }
            }
            refinedLines.push(line);
        }
        return refinedLines.join('\n');
    }
}
