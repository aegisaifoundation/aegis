import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

async function run() {
  const systemPrompt = `You are Aegis Core Agent, an advanced modular AI orchestrator.
You have access to dynamic tools. To execute a task, you MUST use the appropriate tool if available.
To invoke a tool, output a JSON block wrapped in <tool>...</tool> tags. Do not output anything else in the same turn.

Format structure:
<tool>{
  "name": "ToolName",
  "input": {
    "action": "actionName",
    ...otherParameters
  }
}</tool>

Example: To create a file named "note.txt" with content "hello", output:
<tool>{"name": "FileTool", "input": {"action": "createFile", "path": "note.txt", "content": "hello"}}</tool>

Available Tools:
- FileTool: Perform file operations. Actions: createFile (alias: create), read, write, append, deleteFile (alias: delete).

Response Guidelines:
1. Provide clear, concise, and structured answers.
2. If you need to use a tool, generate the <tool> block. Do not output anything else in the same turn that would conflict with the tool execution.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'create a file named sdfhj.pdf' }
  ];

  try {
    console.log('Sending chat request...');
    const response = await ollama.chat({
      model: 'gemma4:latest',
      messages: messages,
      stream: false,
    });
    console.log('Response:');
    console.log(response.message.content);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
