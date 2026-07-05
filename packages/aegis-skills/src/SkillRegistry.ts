import { Skill } from './Skill.js';
import { SkillState } from './SkillState.js';
import { eventBus } from '@aegis/runtime';

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private states: Map<string, SkillState> = new Map();
  private contextCreator?: (name: string) => any;

  register(skill: Skill): void {
    this.skills.set(skill.name, skill);
    this.states.set(skill.name, SkillState.DISCOVERED);
    eventBus.emit('skill_registered', { name: skill.name, version: skill.version });
  }

  unregister(name: string): boolean {
    const deleted = this.skills.delete(name);
    if (deleted) {
      this.states.delete(name);
      eventBus.emit('skill_unregistered', { name });
    }
    return deleted;
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  list(): Skill[] {
    return Array.from(this.skills.values());
  }

  setSkillState(name: string, state: SkillState): void {
    this.states.set(name, state);
    eventBus.emit('skill_state_changed', { name, state });
  }

  getSkillState(name: string): SkillState | undefined {
    return this.states.get(name);
  }

  setContextCreator(creator: (name: string) => any): void {
    this.contextCreator = creator;
  }

  async executeSkill(name: string, input: any): Promise<any> {
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
    } catch (err: any) {
      eventBus.emit('skill_failed', { name, error: err.message, input });
      throw err;
    }
  }
}

export const skillRegistry = new SkillRegistry();
