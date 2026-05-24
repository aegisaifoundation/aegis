import { parser } from '../utils/parser.js';

export interface ToolCall {
  name: string;
  input: string;
}

export class ToolParser {
  parse(text: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const regex = /<tool>(.*?)<\/tool>/gs;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        const rawContent = match[1].trim();
        try {
          // Attempt standard JSON parse
          const parsed = JSON.parse(rawContent);
          if (parsed && typeof parsed.name === 'string') {
            toolCalls.push({
              name: parsed.name,
              input: typeof parsed.input === 'object' ? JSON.stringify(parsed.input) : parsed.input || ''
            });
          }
        } catch (e) {
          // JSON repair attempts
          const repaired = this.attemptJSONRepair(rawContent);
          if (repaired && repaired.name) {
            toolCalls.push(repaired);
          }
        }
      }
    }
    return toolCalls;
  }

  private attemptJSONRepair(rawContent: string): ToolCall | null {
    try {
      // Regex search for name and input fields in a potentially broken JSON format
      const nameMatch = rawContent.match(/"name"\s*:\s*"([^"]+)"/);
      const inputMatch = rawContent.match(/"input"\s*:\s*("(?:[^"\\]|\\.)*"|\{[^}]*\})/);

      if (nameMatch) {
        const name = nameMatch[1];
        let input = '';
        if (inputMatch) {
          const rawInput = inputMatch[1];
          if (rawInput.startsWith('{')) {
            // It looks like an object
            input = rawInput;
          } else {
            // It looks like a string
            try {
              input = JSON.parse(rawInput);
            } catch {
              input = rawInput;
            }
          }
        }
        return { name, input };
      }
    } catch {
      // Ignore repair failures
    }
    return null;
  }
}

export const toolParser = new ToolParser();
