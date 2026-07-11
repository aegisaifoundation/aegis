import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { eventBus } from '../eventbus/EventBus.js';
import { serviceRegistry } from '../registry/ServiceRegistry.js';
import { toolParser } from './ToolParser.js';
import { workspaceManager } from '../workspace/WorkspaceManager.js';
import { runtimeSessionManager } from './RuntimeSessionManager.js';
import { sessionStateManager } from './SessionStateManager.js';
const getConversationContext = () => serviceRegistry.get('conversationContext');
const getAgent = () => serviceRegistry.get('agent');
const getToolRegistry = () => serviceRegistry.get('toolRegistry');
const getSkillRegistry = () => serviceRegistry.get('skillRegistry');
const getProviderManager = () => serviceRegistry.get('providerManager');
const getMemoryGateway = () => serviceRegistry.get('memoryGateway');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const runtimeConfigPath = path.resolve(__dirname, '../config/runtime.json');
let runtimeConfig = {
    maxReasoningSteps: 5,
    maxToolExecutions: 5,
    streamResponses: true,
    enableInterruptions: true
};
function isTaskAssignment(input) {
    const lowercase = input.toLowerCase();
    const taskKeywords = [
        'create', 'write', 'modify', 'delete', 'implement', 'build', 'run',
        'test', 'execute', 'file', 'folder', 'directory', 'workspace', 'code',
        'script', 'program', 'develop', 'setup', 'install', 'configure', 'refactor',
        'debug', 'fix', 'add tool', 'add skill', 'add plugin', 'remove tool',
        'remove skill', 'remove plugin', 'save to memory', 'delete session',
        'archive session'
    ];
    return taskKeywords.some(keyword => lowercase.includes(keyword)) || input.length > 120;
}
try {
    if (fs.existsSync(runtimeConfigPath)) {
        runtimeConfig = JSON.parse(fs.readFileSync(runtimeConfigPath, 'utf8'));
    }
}
catch (e) {
    console.warn('Failed to load runtime.json, using default options', e);
}
export class RuntimeExecutor {
    status = 'IDLE';
    maxSteps = runtimeConfig.maxReasoningSteps || 5;
    getStatus() {
        return this.status;
    }
    setStatus(status) {
        this.status = status;
    }
    async execute(userInput) {
        if (this.status !== 'IDLE') {
            throw new Error(`Cannot execute input; current state is ${this.status}`);
        }
        // ── Cache session ID for this turn — avoid repeated disk reads ──
        const sessionId = (await runtimeSessionManager.getActiveSession()) || 'default';
        const executedActions = [];
        let assistantContent = '';
        try {
            // If using the local GGUF provider, run a direct chat generation and bypass cognitive agent steps
            if (getProviderManager().getActiveProviderName() === 'local/gguf') {
                this.status = 'THINKING';
                eventBus.emit('execution_started', { input: userInput });
                eventBus.emit('message_received', { role: 'user', content: userInput });
                eventBus.emit('thinking_started');
                await getConversationContext().addMessage('user', userInput);
                const messages = await getConversationContext().getMessages();
                eventBus.emit('response_started');
                assistantContent = '';
                const stream = getAgent().streamChat(messages);
                for await (const chunk of stream) {
                    assistantContent += chunk;
                    eventBus.emit('response_chunk', chunk);
                }
                eventBus.emit('response_finished', assistantContent);
                eventBus.emit('message_received', { role: 'assistant', content: assistantContent });
                eventBus.emit('thinking_finished');
                await getConversationContext().addMessage('assistant', assistantContent);
                // Flush buffered history to disk at turn boundary
                await getMemoryGateway().flushHistory(sessionId);
                this.status = 'COMPLETED';
                eventBus.emit('execution_completed', { input: userInput, status: 'COMPLETED' });
                return;
            }
            this.status = 'THINKING';
            eventBus.emit('execution_started', { input: userInput });
            eventBus.emit('message_received', { role: 'user', content: userInput });
            eventBus.emit('thinking_started');
            // ── Turn-level checkpoint: created ONCE per turn, not per mutation ──
            try {
                await sessionStateManager.checkpointSessionState(sessionId, 'pre-mutation-checkpoint');
            }
            catch {
                // Non-fatal — checkpoint failure should not block the turn
            }
            // 1. Goal Detection & Plan Generation (Only run if message assigns a task)
            const isTask = isTaskAssignment(userInput);
            if (isTask) {
                try {
                    const skillsList = getSkillRegistry().list().map((s) => `- ${s.name}: ${s.description}`).join('\n') || 'None';
                    const toolsList = getToolRegistry().getAllTools().map((t) => `- ${t.name}: ${t.description}`).join('\n') || 'None';
                    const detectionPrompt = `You are Aegis, a cognitive AI. Analyze the user's latest message and determine if the user is assigning a new task or specifying a new goal/objective.

Available Skills:
${skillsList}

Available Tools:
${toolsList}

If this is a new task/goal:
1. Formulate a concise "goal" (1 sentence description of the overall task, e.g., "generate portfolio").
2. Formulate a concise "currentObjective" (e.g., "find if there any relevant skills attached; find the tools needed"). This objective should focus on finding relevant skills and tools for the task.
3. Generate a "tasks" list (string array of planned steps/tasks to achieve the goal, identifying which tool or skill to use for each step).
4. Generate an "activeTasks" list (string array of the same tasks, but with status prefix: the first task should be marked as active "[!]", and all subsequent tasks should be marked as pending "[ ]").
5. Generate an "implementationPlan" (detailed plan of what will be done, which files will be created/modified, etc.).

Return the response as a raw JSON object with the following structure:
{
  "isNewGoal": true,
  "goal": "...",
  "currentObjective": "...",
  "tasks": ["task 1", "task 2", ...],
  "activeTasks": ["[!] task 1", "[ ] task 2", ...],
  "implementationPlan": "..."
}

If it is not a new task/goal (e.g., it is a follow-up question, general chat, or clarification), return:
{
  "isNewGoal": false
}

User Message: "${userInput}"
`;
                    const response = await getProviderManager().generate(detectionPrompt);
                    const parsed = parseDetectionResponse(response);
                    if (parsed && parsed.isNewGoal) {
                        await sessionStateManager.updateSessionState(sessionId, {
                            goal: parsed.goal || parsed.currentObjective || '',
                            currentObjective: parsed.currentObjective || '',
                            tasks: parsed.tasks || parsed.activeTasks || [],
                            activeTasks: parsed.activeTasks || [],
                            implementationPlan: parsed.implementationPlan || '',
                            implementedDetails: ''
                        });
                    }
                }
                catch (err) {
                    console.warn('Failed to detect goal / generate plan:', err);
                }
            }
            // Add user message to context
            await getConversationContext().addMessage('user', userInput);
            let step = 0;
            let completed = false;
            while (step < this.maxSteps && !completed && this.status !== 'INTERRUPTED') {
                step++;
                eventBus.emit('loop_step', { step, maxSteps: this.maxSteps });
                // Retrieve messages for model prompt
                const messages = await getConversationContext().getMessages();
                this.status = 'THINKING';
                eventBus.emit('response_started');
                assistantContent = '';
                try {
                    const stream = getAgent().streamChat(messages);
                    for await (const chunk of stream) {
                        if (this.status === 'INTERRUPTED') {
                            break;
                        }
                        assistantContent += chunk;
                        eventBus.emit('response_chunk', chunk);
                    }
                }
                catch (err) {
                    if (this.status === 'INTERRUPTED') {
                        break;
                    }
                    throw err;
                }
                if (this.status === 'INTERRUPTED') {
                    break;
                }
                eventBus.emit('response_finished', assistantContent);
                eventBus.emit('message_received', { role: 'assistant', content: assistantContent });
                eventBus.emit('thinking_finished');
                // Add assistant response to history
                await getConversationContext().addMessage('assistant', assistantContent);
                // Parse tool calls from the assistant response
                const toolCalls = toolParser.parse(assistantContent);
                if (toolCalls.length > 0) {
                    this.status = 'EXECUTING_TOOL';
                    for (const toolCall of toolCalls) {
                        if (this.status === 'INTERRUPTED')
                            break;
                        const tool = getToolRegistry().getTool(toolCall.name);
                        eventBus.emit('tool_started', { name: toolCall.name, input: toolCall.input });
                        let observation = '';
                        if (!tool) {
                            observation = `Error: Tool '${toolCall.name}' not found.`;
                        }
                        else {
                            try {
                                const context = {
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
                            }
                            catch (err) {
                                observation = `Error executing tool '${toolCall.name}': ${err.message || err}`;
                            }
                        }
                        eventBus.emit('tool_finished', { name: toolCall.name, output: observation });
                        executedActions.push({ toolName: toolCall.name, input: toolCall.input, output: observation });
                        // Add tool observation to context
                        await getConversationContext().addMessage('tool', observation, { toolName: toolCall.name });
                    }
                    // Loop continues to next iteration (thinking step) with tool observation in context
                }
                else {
                    // No tool calls, so ReAct loop is complete
                    completed = true;
                }
            }
            if (this.status === 'INTERRUPTED') {
                // Flush history even on interrupt
                await getMemoryGateway().flushHistory(sessionId);
                eventBus.emit('interrupt');
                eventBus.emit('execution_completed', { input: userInput, status: 'INTERRUPTED' });
            }
            else {
                // ── Post-turn: Flush history to disk (was written per-message before) ──
                await getMemoryGateway().flushHistory(sessionId);
                // 2. Turn Concluded: Fact Extraction and Implemented Details Logging (Only run if task)
                try {
                    const freshState = await sessionStateManager.loadSessionState(sessionId);
                    let combinedFacts = freshState.stableFacts || [];
                    let implementedDetails = freshState.implementedDetails || '';
                    let updatedActiveTasks = freshState.activeTasks || [];
                    let updatedObjective = freshState.currentObjective || '';
                    if (isTask) {
                        // ── OPTIMIZATION: Run all 3 post-turn LLM analyses in parallel ──
                        const actionsSummary = executedActions.map(a => `- Executed tool '${a.toolName}' with input ${JSON.stringify(a.input)}`).join('\n');
                        const extractionPromptTask = (async () => {
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
                            const extractionResponse = await getProviderManager().generate(extractionPrompt);
                            return parseFactsResponse(extractionResponse);
                        })();
                        const detailsPromptTask = freshState.currentObjective && freshState.currentObjective !== 'None'
                            ? (async () => {
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
                                const detailsResponse = await getProviderManager().generate(detailsPrompt);
                                return parseDetailsResponse(detailsResponse);
                            })()
                            : Promise.resolve(null);
                        const progressPromptTask = freshState.activeTasks && freshState.activeTasks.length > 0
                            ? (async () => {
                                const progressPrompt = `You are Aegis, a cognitive AI tracking execution progress.
Analyze the conversation and the actions executed during this turn.
Goal: "${freshState.goal || freshState.currentObjective || 'None'}"
Current Objective before this turn: "${freshState.currentObjective || 'None'}"
Planned Tasks:
${(freshState.tasks || []).map((t) => `- ${t}`).join('\n') || 'None'}

Current Active Tasks (with statuses):
${freshState.activeTasks.map((t) => `- ${t}`).join('\n') || 'None'}

Actions executed during this turn:
${actionsSummary || 'No tool actions executed.'}

Assistant Response:
"${assistantContent.slice(0, 1000)}"

Please determine the updated status for each task in the active tasks list.
Use these symbols inside the brackets:
- "[!]" for a task that is currently running or is the very next active task to execute.
- "[✓]" for a task that has been successfully completed.
- "[✗]" for a task that has failed or was not completed.
- "[ ]" for any pending tasks that have not started yet.

Also, formulate the updated "currentObjective" representing what the agent should focus on in the next turn (or "None" if all tasks are completed / the goal is achieved).

Return the output as a raw JSON object with the following structure:
{
  "currentObjective": "...",
  "activeTasks": ["...", "..."]
}
`;
                                const progressResponse = await getProviderManager().generate(progressPrompt);
                                return parseProgressResponse(progressResponse);
                            })()
                            : Promise.resolve(null);
                        // Wait for all 3 LLM calls in parallel
                        const [newFacts, parsedDetails, parsedProgress] = await Promise.all([
                            extractionPromptTask,
                            detailsPromptTask,
                            progressPromptTask
                        ]);
                        // Apply results
                        const currentFacts = freshState.stableFacts || [];
                        combinedFacts = Array.from(new Set([...currentFacts, ...newFacts])).filter(Boolean);
                        if (parsedDetails && parsedDetails.implementedDetails) {
                            implementedDetails = parsedDetails.implementedDetails;
                        }
                        if (parsedProgress) {
                            if (parsedProgress.currentObjective !== undefined) {
                                updatedObjective = parsedProgress.currentObjective;
                            }
                            if (parsedProgress.activeTasks !== undefined) {
                                updatedActiveTasks = parsedProgress.activeTasks;
                            }
                        }
                    }
                    // Save the changes to the session state
                    await sessionStateManager.updateSessionState(sessionId, {
                        stableFacts: combinedFacts,
                        implementedDetails,
                        currentObjective: updatedObjective,
                        activeTasks: updatedActiveTasks
                    });
                }
                catch (err) {
                    console.warn('Failed to perform memory extraction / implementation tracking:', err);
                }
                this.status = 'COMPLETED';
                eventBus.emit('execution_completed', { input: userInput, status: 'COMPLETED' });
            }
        }
        catch (error) {
            this.status = 'ERROR';
            eventBus.emit('runtime_error', error.message || String(error));
            eventBus.emit('execution_completed', { input: userInput, status: 'ERROR', error: error.message || String(error) });
        }
        finally {
            if (this.status !== 'INTERRUPTED') {
                this.status = 'IDLE';
            }
        }
    }
    interrupt() {
        if (this.status === 'THINKING' || this.status === 'EXECUTING_TOOL') {
            this.status = 'INTERRUPTED';
        }
    }
}
function parseDetectionResponse(response) {
    const text = response.trim();
    try {
        return JSON.parse(text);
    }
    catch (e) { }
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[1]);
        }
        catch (e) { }
    }
    const isNewGoal = /"isNewGoal"\s*:\s*true/.test(text);
    if (isNewGoal) {
        const goalMatch = text.match(/"goal"\s*:\s*"([^"]+)"/);
        const objMatch = text.match(/"currentObjective"\s*:\s*"([^"]+)"/);
        const planMatch = text.match(/"implementationPlan"\s*:\s*"([^"]+)"/);
        const tasksMatch = text.match(/"tasks"\s*:\s*\[([\s\S]*?)\]/);
        const activeTasksMatch = text.match(/"activeTasks"\s*:\s*\[([\s\S]*?)\]/);
        const tasks = [];
        if (tasksMatch) {
            const items = tasksMatch[1].match(/"([^"]+)"/g);
            if (items) {
                for (const item of items) {
                    tasks.push(item.replace(/"/g, ''));
                }
            }
        }
        const activeTasks = [];
        if (activeTasksMatch) {
            const items = activeTasksMatch[1].match(/"([^"]+)"/g);
            if (items) {
                for (const item of items) {
                    activeTasks.push(item.replace(/"/g, ''));
                }
            }
        }
        return {
            isNewGoal: true,
            goal: goalMatch ? goalMatch[1] : (objMatch ? objMatch[1] : 'New Goal'),
            currentObjective: objMatch ? objMatch[1] : 'New Objective',
            implementationPlan: planMatch ? planMatch[1] : 'New Plan',
            tasks: tasks.length > 0 ? tasks : activeTasks,
            activeTasks
        };
    }
    return { isNewGoal: false };
}
function parseFactsResponse(response) {
    const text = response.trim();
    try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed))
            return parsed.map(String);
    }
    catch (e) { }
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (Array.isArray(parsed))
                return parsed.map(String);
        }
        catch (e) { }
    }
    const arrayMatch = text.match(/\[\s*("[\s\S]*?"\s*,\s*)*"[\s\S]*?"\s*\]/);
    if (arrayMatch) {
        try {
            const parsed = JSON.parse(arrayMatch[0]);
            if (Array.isArray(parsed))
                return parsed.map(String);
        }
        catch (e) { }
    }
    return text.split('\n')
        .map(l => l.trim().replace(/^[-*+•]\s+/, '').replace(/^\d+\.\s+/, ''))
        .filter(l => l.length > 0);
}
function parseDetailsResponse(response) {
    const text = response.trim();
    try {
        return JSON.parse(text);
    }
    catch (e) { }
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[1]);
        }
        catch (e) { }
    }
    const match = text.match(/"implementedDetails"\s*:\s*"([\s\S]*?)"/);
    if (match) {
        return { implementedDetails: match[1] };
    }
    return { implementedDetails: text };
}
function parseProgressResponse(response) {
    const text = response.trim();
    try {
        return JSON.parse(text);
    }
    catch (e) { }
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[1]);
        }
        catch (e) { }
    }
    const objMatch = text.match(/"currentObjective"\s*:\s*"([^"]+)"/);
    const tasksMatch = text.match(/"activeTasks"\s*:\s*\[([\s\S]*?)\]/);
    const activeTasks = [];
    if (tasksMatch) {
        const items = tasksMatch[1].match(/"([^"]+)"/g);
        if (items) {
            for (const item of items) {
                activeTasks.push(item.replace(/"/g, ''));
            }
        }
    }
    if (objMatch || activeTasks.length > 0) {
        return {
            currentObjective: objMatch ? objMatch[1] : undefined,
            activeTasks: activeTasks.length > 0 ? activeTasks : undefined
        };
    }
    return null;
}
export const runtimeExecutor = new RuntimeExecutor();
