import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { eventBus } from './EventBus.js';
import { serviceRegistry } from './ServiceRegistry.js';
import { conversationContext } from '../context/ConversationContext.js';
import { agent } from '../agent/index.js';
import { toolParser } from './ToolParser.js';
import { toolRegistry, type ToolContext } from '../tools/index.js';
import { RuntimeStatus } from '../types/Runtime.js';
import { workspaceManager } from './WorkspaceManager.js';
import { runtimeSessionManager } from './RuntimeSessionManager.js';
import { sessionStateManager } from './SessionStateManager.js';
import { providerManager } from '../providers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runtimeConfigPath = path.resolve(__dirname, '../config/runtime.json');
let runtimeConfig = {
  maxReasoningSteps: 5,
  maxToolExecutions: 5,
  streamResponses: true,
  enableInterruptions: true
};

try {
  if (fs.existsSync(runtimeConfigPath)) {
    runtimeConfig = JSON.parse(fs.readFileSync(runtimeConfigPath, 'utf8'));
  }
} catch (e) {
  console.warn('Failed to load runtime.json, using default options', e);
}

export class RuntimeExecutor {
  private status: RuntimeStatus = 'IDLE';
  private maxSteps: number = runtimeConfig.maxReasoningSteps || 5;

  getStatus(): RuntimeStatus {
    return this.status;
  }

  setStatus(status: RuntimeStatus) {
    this.status = status;
  }

  async execute(userInput: string): Promise<void> {
    if (this.status !== 'IDLE') {
      throw new Error(`Cannot execute input; current state is ${this.status}`);
    }

    const sessionId = (await runtimeSessionManager.getActiveSession()) || 'default';
    const executedActions: Array<{ toolName: string; input: any; output: string }> = [];
    let assistantContent = '';

    try {
      this.status = 'THINKING';
      eventBus.emit('execution_started', { input: userInput });
      eventBus.emit('message_received', { role: 'user', content: userInput });
      eventBus.emit('thinking_started');

      // 1. Goal Detection & Plan Generation
      try {
        const detectionPrompt = `You are Aegis, a cognitive AI. Analyze the user's latest message and determine if the user is assigning a new task or specifying a new goal/objective.
If this is a new task/goal:
1. Formulate a concise "currentObjective" (1 sentence description).
2. Generate an "activeTasks" list (string array of granular steps to achieve the goal).
3. Generate an "implementationPlan" (detailed plan of what will be done, which files will be created/modified, etc.).

Return the response as a raw JSON object with the following structure:
{
  "isNewGoal": true,
  "currentObjective": "...",
  "activeTasks": ["task 1", "task 2"],
  "implementationPlan": "..."
}

If it is not a new task/goal (e.g., it is a follow-up question, general chat, or clarification), return:
{
  "isNewGoal": false
}

User Message: "${userInput}"
`;
        const response = await providerManager.generate(detectionPrompt);
        const parsed = parseDetectionResponse(response);
        if (parsed && parsed.isNewGoal) {
          // Clear previous plan and start writing new objective, plan, and tasks
          await sessionStateManager.updateSessionState(sessionId, {
            currentObjective: parsed.currentObjective || '',
            activeTasks: parsed.activeTasks || [],
            implementationPlan: parsed.implementationPlan || '',
            implementedDetails: ''
          });
        }
      } catch (err) {
        console.warn('Failed to detect goal / generate plan:', err);
      }

      // Add user message to context
      await conversationContext.addMessage('user', userInput);

      let step = 0;
      let completed = false;

      while (step < this.maxSteps && !completed && (this.status as string) !== 'INTERRUPTED') {
        step++;
        eventBus.emit('loop_step', { step, maxSteps: this.maxSteps });

        // Retrieve messages for model prompt
        const messages = await conversationContext.getMessages();

        this.status = 'THINKING';
        eventBus.emit('response_started');

        assistantContent = '';
        try {
          const stream = agent.streamChat(messages);

          for await (const chunk of stream) {
            if ((this.status as string) === 'INTERRUPTED') {
              break;
            }
            assistantContent += chunk;
            eventBus.emit('response_chunk', chunk);
          }
        } catch (err: any) {
          if ((this.status as string) === 'INTERRUPTED') {
            break;
          }
          throw err;
        }

        if ((this.status as string) === 'INTERRUPTED') {
          break;
        }

        eventBus.emit('response_finished', assistantContent);
        eventBus.emit('message_received', { role: 'assistant', content: assistantContent });
        eventBus.emit('thinking_finished');

        // Add assistant response to history
        await conversationContext.addMessage('assistant', assistantContent);

        // Parse tool calls from the assistant response
        const toolCalls = toolParser.parse(assistantContent);

        if (toolCalls.length > 0) {
          this.status = 'EXECUTING_TOOL';
          
          for (const toolCall of toolCalls) {
            if ((this.status as string) === 'INTERRUPTED') break;

            const tool = toolRegistry.getTool(toolCall.name);
            eventBus.emit('tool_started', { name: toolCall.name, input: toolCall.input });

            let observation = '';
            if (!tool) {
              observation = `Error: Tool '${toolCall.name}' not found.`;
            } else {
              try {
                const context: ToolContext = {
                  workspacePath: workspaceManager.getWorkspacePath(),
                  sessionId,
                  permissions: tool.permissions || {},
                  runtimeMetadata: {
                    maxSteps: this.maxSteps
                  },
                  activeAgentId: 'aegis-core-agent',
                  runtimeConfig: runtimeConfig,
                  memoryRegistry: serviceRegistry.has('memoryRegistry') ? serviceRegistry.get('memoryRegistry') : undefined,
                  eventBus: serviceRegistry.has('eventBus') ? serviceRegistry.get('eventBus') : undefined
                };
                observation = await tool.execute(toolCall.input, context);
              } catch (err: any) {
                observation = `Error executing tool '${toolCall.name}': ${err.message || err}`;
              }
            }

            eventBus.emit('tool_finished', { name: toolCall.name, output: observation });
            executedActions.push({ toolName: toolCall.name, input: toolCall.input, output: observation });
            
            // Add tool observation to context
            await conversationContext.addMessage('tool', observation, { toolName: toolCall.name });
          }

          // Loop continues to next iteration (thinking step) with tool observation in context
        } else {
          // No tool calls, so ReAct loop is complete
          completed = true;
        }
      }

      if ((this.status as string) === 'INTERRUPTED') {
        eventBus.emit('interrupt');
        eventBus.emit('execution_completed', { input: userInput, status: 'INTERRUPTED' });
      } else {
        // 2. Turn Concluded: Fact Extraction and Implemented Details Logging
        try {
          const freshState = await sessionStateManager.loadSessionState(sessionId);
          
          // Auto Fact Extraction
          const extractionPrompt = `You are Aegis, a cognitive AI. Analyze the latest user message and assistant response from the conversation.
Extract any new, permanent facts, user preferences, or goals that are important to remember across session iterations.
Do not extract transient steps, commands, error messages, or conversational fluff.
Provide your output as a raw JSON array of strings, matching the format: ["fact 1", "fact 2", ...]. If no new relevant facts or preferences are mentioned, return [].
Latest User Message:
<user>
${userInput}
</user>
Latest Assistant Response:
<assistant>
${assistantContent}
</assistant>
`;
          const extractionResponse = await providerManager.generate(extractionPrompt);
          const newFacts = parseFactsResponse(extractionResponse);
          
          const currentFacts = freshState.stableFacts || [];
          const combinedFacts = Array.from(new Set([...currentFacts, ...newFacts])).filter(Boolean);

          // Implemented Details Tracking
          let implementedDetails = freshState.implementedDetails || '';
          if (freshState.currentObjective && freshState.currentObjective !== 'None') {
            const actionsSummary = executedActions.map(a => `- Executed tool '${a.toolName}' with input ${JSON.stringify(a.input)}`).join('\n');
            const detailsPrompt = `You are Aegis, a cognitive AI. Analyze the actions performed during the latest turn to satisfy the user's objective.
Objective: "${freshState.currentObjective}"
Implementation Plan: "${freshState.implementationPlan || 'None'}"
Actions executed:
${actionsSummary || 'No tool actions executed.'}
Assistant Response Summary: "${assistantContent.slice(0, 1000)}"

Summarize the implemented details of what was actually completed and modified during this turn. Be precise about files created/modified, operations performed, and status.
Provide your output as a raw JSON object containing the key "implementedDetails":
{
  "implementedDetails": "..."
}
`;
            const detailsResponse = await providerManager.generate(detailsPrompt);
            const parsedDetails = parseDetailsResponse(detailsResponse);
            if (parsedDetails && parsedDetails.implementedDetails) {
              implementedDetails = parsedDetails.implementedDetails;
            }
          }

          // Save the changes to the session state
          await sessionStateManager.updateSessionState(sessionId, {
            stableFacts: combinedFacts,
            implementedDetails
          });
        } catch (err) {
          console.warn('Failed to perform memory extraction / implementation tracking:', err);
        }

        this.status = 'COMPLETED';
        eventBus.emit('execution_completed', { input: userInput, status: 'COMPLETED' });
      }
    } catch (error: any) {
      this.status = 'ERROR';
      eventBus.emit('runtime_error', error.message || String(error));
      eventBus.emit('execution_completed', { input: userInput, status: 'ERROR', error: error.message || String(error) });
    } finally {
      if ((this.status as string) !== 'INTERRUPTED') {
        this.status = 'IDLE';
      }
    }
  }

  interrupt(): void {
    if (this.status === 'THINKING' || this.status === 'EXECUTING_TOOL') {
      this.status = 'INTERRUPTED';
    }
  }
}

function parseDetectionResponse(response: string): any {
  const text = response.trim();
  try {
    return JSON.parse(text);
  } catch (e) {}

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {}
  }

  const isNewGoal = /"isNewGoal"\s*:\s*true/.test(text);
  if (isNewGoal) {
    const objMatch = text.match(/"currentObjective"\s*:\s*"([^"]+)"/);
    const planMatch = text.match(/"implementationPlan"\s*:\s*"([^"]+)"/);
    const tasksMatch = text.match(/"activeTasks"\s*:\s*\[([\s\S]*?)\]/);
    const activeTasks: string[] = [];
    if (tasksMatch) {
      const items = tasksMatch[1].match(/"([^"]+)"/g);
      if (items) {
        for (const item of items) {
          activeTasks.push(item.replace(/"/g, ''));
        }
      }
    }
    return {
      isNewGoal: true,
      currentObjective: objMatch ? objMatch[1] : 'New Objective',
      implementationPlan: planMatch ? planMatch[1] : 'New Plan',
      activeTasks
    };
  }
  return { isNewGoal: false };
}

function parseFactsResponse(response: string): string[] {
  const text = response.trim();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch (e) {}

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {}
  }

  const arrayMatch = text.match(/\[\s*("[\s\S]*?"\s*,\s*)*"[\s\S]*?"\s*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {}
  }

  return text.split('\n')
    .map(l => l.trim().replace(/^[-*+•]\s+/, '').replace(/^\d+\.\s+/, ''))
    .filter(l => l.length > 0);
}

function parseDetailsResponse(response: string): any {
  const text = response.trim();
  try {
    return JSON.parse(text);
  } catch (e) {}

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {}
  }

  const match = text.match(/"implementedDetails"\s*:\s*"([\s\S]*?)"/);
  if (match) {
    return { implementedDetails: match[1] };
  }

  return { implementedDetails: text };
}

export const runtimeExecutor = new RuntimeExecutor();

