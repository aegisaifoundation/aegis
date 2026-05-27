import { Message } from '../types/Message.js';
import { ChatMessage } from '../providers/index.js';
import { promptBuilder } from './PromptBuilder.js';
import { runtimeStateManager } from '../runtime/RuntimeStateManager.js';
import { memoryGateway } from '../memory/MemoryGateway.js';

export class MessageFormatter {
  async formatMessages(messages: Message[]): Promise<ChatMessage[]> {
    const formatted: ChatMessage[] = [];

    // 1. Fetch system rules
    const systemRules = promptBuilder.buildSystemPrompt();

    // 2. Fetch runtime state
    let runtimeStateStr = 'None';
    try {
      const state = await runtimeStateManager.loadState();
      runtimeStateStr = [
        `Active Session: ${state.activeSessionId || 'None'}`,
        `Runtime Epoch: ${state.runtimeEpoch || 0}`,
        `Runtime Lock State: ${state.runtimeLockState || 'IDLE'}`,
        `Runtime Health Status: ${state.runtimeHealthStatus || 'HEALTHY'}`
      ].join('\n');
    } catch (err: any) {
      runtimeStateStr = `Error loading runtime state: ${err.message}`;
    }

    // 3. Fetch working memory and session memory
    let workingMemoryStr = 'None';
    let sessionMemoryStr = 'None';
    try {
      const state = await runtimeStateManager.loadState();
      if (state.activeSessionId) {
        workingMemoryStr = await memoryGateway.getWorkingMemory(state.activeSessionId);
        sessionMemoryStr = await memoryGateway.getSessionMemory(state.activeSessionId);
      }
    } catch (err: any) {
      // ignore
    }

    // 4. Combine in strict order: system rules -> runtime state -> working memory -> session memory
    const systemContent = [
      `# SYSTEM RULES`,
      systemRules,
      ``,
      `# RUNTIME STATE`,
      runtimeStateStr,
      ``,
      `# WORKING MEMORY PROJECTION`,
      workingMemoryStr || 'None',
      ``,
      `# SESSION MEMORY PROJECTION`,
      sessionMemoryStr || 'None'
    ].join('\n');

    // Prepend the stabilized system prompt
    formatted.push({
      role: 'system',
      content: systemContent
    });

    // 5. Map each message to standard model chat message
    for (const msg of messages) {
      let role: ChatMessage['role'] = 'user';
      if (msg.role === 'assistant') role = 'assistant';
      if (msg.role === 'system') role = 'system';
      if (msg.role === 'tool' || msg.role === 'observation') role = 'tool';
      
      formatted.push({
        role,
        content: msg.content
      });
    }

    return formatted;
  }
}

export const messageFormatter = new MessageFormatter();
