import path from 'path';
import { existsSync } from 'fs';
import { SessionState } from './interfaces/MemoryTypes.js';
import { memoryGateway } from './MemoryGateway.js';
import { toolRegistry } from '../tools/index.js';
import { skillRegistry } from '../skills/index.js';

export class ProjectionGenerator {
  public static readonly MAX_WORKING_WORDS = 1000;
  public static readonly MAX_SESSION_WORDS = 1000;

  /**
   * Generates working-memory.md projection from SessionState.
   */
  public generateWorkingMemoryProjection(state: SessionState): string {
    const lines: string[] = [];
    
    // Header section
    lines.push(`- goal: ${state.goal || state.currentObjective || 'None'}`);
    lines.push(`- current objective: ${state.currentObjective || 'None'}`);
    lines.push('');
    
    // Available tools
    lines.push('available tools:');
    const tools = toolRegistry.getAllTools();
    if (tools.length > 0) {
      for (const tool of tools) {
        lines.push(`- ${tool.name}`);
      }
    } else {
      lines.push('- None');
    }
    lines.push('');

    // Available skills
    lines.push('available skills:');
    const skills = skillRegistry.list();
    if (skills.length > 0) {
      for (const skill of skills) {
        const suffix = skill.name.toLowerCase().endsWith('skill') ? '' : ' skill';
        lines.push(`- ${skill.name}${suffix}`);
      }
    } else {
      lines.push('- None');
    }
    lines.push('');
    
    // Tasks list
    lines.push('tasks:');
    const tasksList = state.tasks || state.activeTasks || [];
    if (tasksList.length > 0) {
      for (const task of tasksList) {
        // Strip any existing checkbox prefix from the static tasks list
        const cleanTask = task.replace(/^-\s+/, '').replace(/^\[[\s\S]*?\]\s*/, '');
        lines.push(`- ${cleanTask}`);
      }
    } else {
      lines.push('- None');
    }
    lines.push('');
    
    // Active tasks with statuses
    lines.push('active task');
    lines.push('');
    if (state.activeTasks && state.activeTasks.length > 0) {
      for (const task of state.activeTasks) {
        const hasPrefix = /^\[[!✓✗\s]\]/.test(task);
        if (hasPrefix) {
          lines.push(task);
        } else {
          lines.push(`[ ] ${task}`);
        }
      }
    } else {
      lines.push('None');
    }
    lines.push('');

    // If there is temporary execution context, we append it at the bottom to ensure
    // ProjectionConsistencyValidator continues to pass without errors if it contains keys.
    const tempContext = state.temporaryExecutionContext || {};
    const keys = Object.keys(tempContext);
    if (keys.length > 0) {
      lines.push('## Temporary Execution Context');
      for (const key of keys) {
        const val = typeof tempContext[key] === 'object' ? JSON.stringify(tempContext[key]) : String(tempContext[key]);
        lines.push(`- **${key}**: ${val}`);
      }
      lines.push('');
    }
    
    const content = lines.join('\n');
    return this.trimProjection(content, ProjectionGenerator.MAX_WORKING_WORDS);
  }

  /**
   * Generates session-memory.md projection from SessionState.
   */
  public generateSessionMemoryProjection(state: SessionState): string {
    const lines: string[] = [];
    lines.push('## Goals');
    lines.push(state.currentObjective ? `- **Current Goal**: ${state.currentObjective}` : 'None');
    lines.push('');

    lines.push('## Preferences');
    const prefs = state.preferences || {};
    const keys = Object.keys(prefs);
    if (keys.length > 0) {
      for (const key of keys) {
        const val = typeof prefs[key] === 'object' ? JSON.stringify(prefs[key]) : String(prefs[key]);
        lines.push(`- **${key}**: ${val}`);
      }
    } else {
      lines.push('None');
    }
    lines.push('');

    lines.push('## Stable Facts');
    const facts = state.stableFacts || [];
    if (facts.length > 0) {
      for (const fact of facts) {
        lines.push(`- ${fact}`);
      }
    } else {
      lines.push('None');
    }
    lines.push('');

    const content = lines.join('\n');
    return this.trimProjection(content, ProjectionGenerator.MAX_SESSION_WORDS);
  }

  /**
   * Projects session state to markdown files. Writes using MemoryGateway.
   */
  public async projectSessionState(sessionId: string, state?: SessionState, txId?: string, actor: string = 'system'): Promise<void> {
    const currentState = state || await memoryGateway.getSessionState(sessionId, actor);
    const workingProj = this.generateWorkingMemoryProjection(currentState);
    const sessionProj = this.generateSessionMemoryProjection(currentState);

    await memoryGateway.updateWorkingMemory(sessionId, workingProj, txId, actor);
    await memoryGateway.updateSessionMemory(sessionId, sessionProj, txId, actor);
  }

  /**
   * Trims content to the word limit.
   */
  public trimProjection(content: string, maxWords: number): string {
    if (this.validateProjectionSize(content, maxWords)) {
      return content;
    }
    const words = content.trim().split(/\s+/);
    return words.slice(0, maxWords).join(' ') + '\n\n... [TRUNCATED DUE TO TOKEN BUDGET LIMIT]';
  }

  /**
   * Formats a summary of the projection.
   */
  public summarizeProjection(content: string): string {
    const lines = content.split('\n');
    const headersAndLists = lines.filter(l => l.trim().startsWith('##') || l.trim().startsWith('-'));
    return headersAndLists.join('\n');
  }

  /**
   * Validates if the content fits in the word budget.
   */
  public validateProjectionSize(content: string, maxWords: number): boolean {
    const words = content.trim().split(/\s+/).filter(Boolean);
    return words.length <= maxWords;
  }
}

export const projectionGenerator = new ProjectionGenerator();
