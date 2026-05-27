import { parser } from '../utils/parser.js';

export interface ToolCall {
  name: string;
  input: string;
}

export class ToolParser {
  private escapeJSONNewlines(jsonString: string): string {
    let inString = false;
    let escaped = '';
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      if (char === '"') {
        let backslashes = 0;
        for (let j = i - 1; j >= 0; j--) {
          if (jsonString[j] === '\\') {
            backslashes++;
          } else {
            break;
          }
        }
        if (backslashes % 2 === 0) {
          inString = !inString;
        }
        escaped += char;
      } else if (inString && char === '\n') {
        escaped += '\\n';
      } else if (inString && char === '\r') {
        escaped += '\\r';
      } else {
        escaped += char;
      }
    }
    return escaped;
  }

  parse(text: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const regex = /<tool>(.*?)<\/tool(?:_response)?>/gs;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        const rawContent = match[1].trim();
        try {
          // Pre-process to escape literal newlines inside JSON string literals
          const escapedContent = this.escapeJSONNewlines(rawContent);
          const parsed = JSON.parse(escapedContent);
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
