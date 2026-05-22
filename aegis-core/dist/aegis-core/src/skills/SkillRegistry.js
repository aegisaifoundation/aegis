import { SkillState } from './SkillState.js';
import { eventBus } from '../runtime/EventBus.js';
export class SkillRegistry {
    skills = new Map();
    states = new Map();
    contextCreator;
    register(skill) {
        this.skills.set(skill.name, skill);
        this.states.set(skill.name, SkillState.DISCOVERED);
        eventBus.emit('skill_registered', { name: skill.name, version: skill.version });
    }
    unregister(name) {
        const deleted = this.skills.delete(name);
        if (deleted) {
            this.states.delete(name);
            eventBus.emit('skill_unregistered', { name });
        }
        return deleted;
    }
    get(name) {
        return this.skills.get(name);
    }
    list() {
        return Array.from(this.skills.values());
    }
    setSkillState(name, state) {
        this.states.set(name, state);
        eventBus.emit('skill_state_changed', { name, state });
    }
    getSkillState(name) {
        return this.states.get(name);
    }
    setContextCreator(creator) {
        this.contextCreator = creator;
    }
    async executeSkill(name, input) {
        const skill = this.get(name);
        if (!skill) {
            throw new Error(`Skill ${name} is not registered.`);
        }
        const state = this.getSkillState(name);
        if (state !== SkillState.ACTIVE) {
            throw new Error(`Skill ${name} is not active (current state: ${state}).`);
        }
        if (!this.contextCreator) {
            throw new Error(`Skill registry has no context creator registered.`);
        }
        eventBus.emit('skill_execute_started', { name, input });
        try {
            const context = this.contextCreator(name);
            const result = await skill.execute(input, context);
            eventBus.emit('skill_executed', { name, input, result });
            return result;
        }
        catch (err) {
            eventBus.emit('skill_failed', { name, error: err.message, input });
            throw err;
        }
    }
}
export const skillRegistry = new SkillRegistry();
