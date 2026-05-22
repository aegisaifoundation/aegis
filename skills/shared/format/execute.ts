import type { SkillContext } from '../../../aegis-core/src/skills/SkillContext.js';

export default async function execute(input: any, context: SkillContext): Promise<{ formatted: string }> {
  let content = '';
  let action: 'markdown' | 'json' | 'whitespace' | 'codeblock' | 'sanitize' | 'all' = 'all';

  if (typeof input === 'string') {
    content = input;
  } else if (input && typeof input.content === 'string') {
    content = input.content;
    if (input.action) {
      action = input.action;
    }
  } else {
    throw new Error('Input must be a string or contain a "content" field.');
  }

  const formatCodeBlock = (val: string): string => {
    let cleaned = val.trim();
    if (cleaned.includes('```')) {
      const match = cleaned.match(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)\n```/);
      if (match) {
        return match[1].trim();
      }
    }
    return cleaned;
  };

  const formatJson = (val: string): string => {
    const codeblockStripped = formatCodeBlock(val);
    try {
      const obj = JSON.parse(codeblockStripped);
      return JSON.stringify(obj, null, 2);
    } catch {
      return val;
    }
  };

  const formatWhitespace = (val: string): string => {
    return val
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const formatMarkdown = (val: string): string => {
    return val
      .replace(/\r\n/g, '\n')
      .replace(/^(#+)\s*(.*?)$/gm, (match, p1, p2) => `${p1} ${p2.trim()}`)
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const formatSanitize = (val: string): string => {
    return val
      .replace(/\r\n/g, '\n')
      .replace(/^[\s]*(assistant:|system:|user:)[\s]*/gim, '')
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
      .trim();
  };

  let result = content;

  switch (action) {
    case 'codeblock':
      result = formatCodeBlock(content);
      break;
    case 'json':
      result = formatJson(content);
      break;
    case 'whitespace':
      result = formatWhitespace(content);
      break;
    case 'markdown':
      result = formatMarkdown(content);
      break;
    case 'sanitize':
      result = formatSanitize(content);
      break;
    case 'all':
    default:
      result = formatSanitize(result);
      result = formatMarkdown(result);

      // Interpolate and format nested code blocks in place
      result = result.replace(/```(json)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
        try {
          const obj = JSON.parse(code.trim());
          const pretty = JSON.stringify(obj, null, 2);
          return `\`\`\`${lang || 'json'}\n${pretty}\n\`\`\``;
        } catch {
          return match;
        }
      });

      result = formatWhitespace(result);
      break;
  }

  return { formatted: result };
}
